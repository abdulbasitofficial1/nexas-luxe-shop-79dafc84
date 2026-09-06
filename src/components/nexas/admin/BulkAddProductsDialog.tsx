import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { collection, doc, writeBatch } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useFirebase } from "@/lib/firebase";
import { cleanProductImageUrl } from "@/lib/product-display";
import { isStorageUrl } from "@/lib/product-images";
import {
  uploadProductFile,
  validateImageFile,
} from "@/lib/product-upload";
import { ProductImage } from "@/components/nexas/ProductImage";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: string[];
}

interface OptionRow {
  name: string;
  values: string;
}

interface FormRow {
  name: string;
  price: string;
  category: string;
  description: string;

  // Final saved images
  images: string[];

  // Current URL input
  urlInput: string;

  options: OptionRow[];

  uploads: {
    name: string;
    percent: number;
  }[];
}

const COUNTS = [1, 2, 3, 4] as const;
const MAX_PRODUCTS = 4;

const emptyRow = (): FormRow => ({
  name: "",
  price: "",
  category: "",
  description: "",
  images: [],
  urlInput: "",
  options: [],
  uploads: [],
});

export function BulkAddProductsDialog({
  open,
  onOpenChange,
  categories,
}: Props) {
  const { db, storage } = useFirebase();

  const [count, setCount] = useState<number | null>(null);
  const [rows, setRows] = useState<FormRow[]>([]);
  const [saving, setSaving] = useState(false);

  const uploading = rows.some(
    (row) => row.uploads.length > 0,
  );

  /*
   * IMPORTANT:
   * Product data is stored in `rows`.
   * Changing product count no longer wipes existing products.
   */
  const pickCount = (n: number) => {
    setCount(n);

    setRows((previous) => {
      if (previous.length === n) {
        return previous;
      }

      if (previous.length < n) {
        return [
          ...previous,
          ...Array.from(
            { length: n - previous.length },
            () => emptyRow(),
          ),
        ];
      }

      return previous.slice(0, n);
    });
  };

  const reset = () => {
    setCount(null);
    setRows([]);
  };

  const close = (value: boolean) => {
    if (saving || uploading) return;

    if (!value) {
      reset();
    }

    onOpenChange(value);
  };

  /*
   * Update only one product.
   * Other products remain untouched.
   */
  const patch = (
    index: number,
    update:
      | Partial<FormRow>
      | ((row: FormRow) => Partial<FormRow>),
  ) => {
    setRows((previous) =>
      previous.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        const changes =
          typeof update === "function"
            ? update(row)
            : update;

        return {
          ...row,
          ...changes,
        };
      }),
    );
  };

  /*
   * Add image URL to a product.
   */
  const addUrl = (index: number) => {
    const row = rows[index];

    if (!row) return;

    const url = cleanProductImageUrl(
      row.urlInput.trim(),
    );

    if (!url) {
      toast.error(
        "Enter a valid image URL (https://…).",
      );
      return;
    }

    if (url.startsWith("blob:")) {
      toast.error(
        "Temporary browser links cannot be saved.",
      );
      return;
    }

    patch(index, (current) => ({
      images: current.images.includes(url)
        ? current.images
        : [...current.images, url],
      urlInput: "",
    }));
  };

  /*
   * Remove image from a product.
   */
  const removeImage = (
    productIndex: number,
    imageUrl: string,
  ) => {
    patch(productIndex, (row) => ({
      images: row.images.filter(
        (url) => url !== imageUrl,
      ),
    }));
  };

  /*
   * Upload multiple gallery images.
   */
  const handleFiles = async (
    productIndex: number,
    files: FileList | null,
  ) => {
    if (!files?.length) return;

    if (!storage) {
      toast.error("Storage not connected.");
      return;
    }

    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      const error = validateImageFile(file);

      if (error) {
        toast.error(error);
      } else {
        validFiles.push(file);
      }
    }

    if (!validFiles.length) return;

    patch(productIndex, {
      uploads: validFiles.map((file) => ({
        name: file.name,
        percent: 0,
      })),
    });

    for (
      let fileIndex = 0;
      fileIndex < validFiles.length;
      fileIndex++
    ) {
      const file = validFiles[fileIndex];

      try {
        const url = await uploadProductFile(
          storage,
          file,
          (percent) => {
            patch(productIndex, (row) => ({
              uploads: row.uploads.map(
                (upload, index) =>
                  index === fileIndex
                    ? {
                        ...upload,
                        percent,
                      }
                    : upload,
              ),
            }));
          },
        );

        patch(productIndex, (row) => ({
          images: row.images.includes(url)
            ? row.images
            : [...row.images, url],
        }));
      } catch (error) {
        console.error(error);

        toast.error(
          `Failed to upload ${file.name}`,
        );
      }
    }

    patch(productIndex, {
      uploads: [],
    });
  };

  /*
   * Save all products in one Firestore batch.
   */
  const saveAll = async () => {
    if (!db) {
      toast.error("Store not connected.");
      return;
    }

    if (uploading) {
      toast.error(
        "Please wait for image uploads to finish.",
      );
      return;
    }

    const payloads: Record<
      string,
      unknown
    >[] = [];

    for (
      let productIndex = 0;
      productIndex < rows.length;
      productIndex++
    ) {
      const row = rows[productIndex];

      const label = `Product ${
        productIndex + 1
      }`;

      const name = row.name.trim();

      const category =
        row.category.trim();

      const price = Number(
        String(row.price).replace(
          /[^0-9.]/g,
          "",
        ),
      );

      const images = row.images
        .map((url) =>
          cleanProductImageUrl(url),
        )
        .filter(
          (url) =>
            url &&
            !url.startsWith("blob:"),
        );

      if (!name) {
        toast.error(
          `${label}: name is required.`,
        );
        return;
      }

      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {
        toast.error(
          `${label}: enter a valid price.`,
        );
        return;
      }

      if (!category) {
        toast.error(
          `${label}: category is required.`,
        );
        return;
      }

      if (!images.length) {
        toast.error(
          `${label}: add at least one image.`,
        );
        return;
      }

      const options = row.options
        .map((option) => ({
          name: option.name.trim(),

          values: option.values
            .split(",")
            .map((value) =>
              value.trim(),
            )
            .filter(Boolean),
        }))
        .filter(
          (option) =>
            option.name &&
            option.values.length,
        );

      payloads.push({
        name,
        price,
        category,
        description:
          row.description.trim(),

        // First image is main image
        image: images[0],

        // All images
        images,

        options,

        createdAt: Date.now(),
      });
    }

    setSaving(true);

    try {
      const batch = writeBatch(db);

      const productsCollection =
        collection(db, "products");

      for (const product of payloads) {
        batch.set(
          doc(productsCollection),
          product,
        );
      }

      await batch.commit();

      toast.success(
        payloads.length === 1
          ? "Product saved"
          : `${payloads.length} products saved`,
      );

      reset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to save products",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={close}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            Add Products
          </DialogTitle>

          <DialogDescription>
            Choose how many products to add
            (up to {MAX_PRODUCTS}), fill in
            each one, then save them all at
            once.
          </DialogDescription>
        </DialogHeader>

        <datalist id="bulk-categories">
          {categories.map((category) => (
            <option
              key={category}
              value={category}
            />
          ))}
        </datalist>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            How many products?
          </span>

          {COUNTS.map((number) => (
            <Button
              key={number}
              type="button"
              size="sm"
              variant={
                count === number
                  ? "gold"
                  : "goldOutline"
              }
              onClick={() =>
                pickCount(number)
              }
              disabled={
                saving || uploading
              }
            >
              {number}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          {rows.map((row, index) => (
            <ProductRowForm
              key={index}
              index={index}
              row={row}
              disabled={saving}
              onChange={(update) =>
                patch(index, update)
              }
              onAddUrl={() =>
                addUrl(index)
              }
              onRemoveImage={(url) =>
                removeImage(
                  index,
                  url,
                )
              }
              onFiles={(files) =>
                handleFiles(
                  index,
                  files,
                )
              }
            />
          ))}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() =>
              close(false)
            }
            disabled={
              saving || uploading
            }
          >
            Cancel
          </Button>

          <Button
            variant="gold"
            onClick={saveAll}
            disabled={
              saving ||
              uploading ||
              !rows.length
            }
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}

            Save All Products
            {rows.length > 1
              ? ` (${rows.length})`
              : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductRowForm({
  index,
  row,
  disabled,
  onChange,
  onAddUrl,
  onRemoveImage,
  onFiles,
}: {
  index: number;
  row: FormRow;
  disabled: boolean;
  onChange: (
    update: Partial<FormRow>,
  ) => void;
  onAddUrl: () => void;
  onRemoveImage: (
    url: string,
  ) => void;
  onFiles: (
    files: FileList | null,
  ) => void;
}) {
  const fileRef =
    useRef<HTMLInputElement>(null);

  const id = (field: string) =>
    `bulk-${index}-${field}`;

  const uploading =
    row.uploads.length > 0;

  const liveUrl =
    row.urlInput.trim()
      ? cleanProductImageUrl(
          row.urlInput.trim(),
        )
      : "";

  const setOption = (
    optionIndex: number,
    update: Partial<OptionRow>,
  ) => {
    onChange({
      options: row.options.map(
        (option, index) =>
          index === optionIndex
            ? {
                ...option,
                ...update,
              }
            : option,
      ),
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
      <p className="font-display text-lg">
        Product {index + 1}
      </p>

      {/* PRODUCT DETAILS */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label
            htmlFor={id("name")}
          >
            Product Name
          </Label>

          <Input
            id={id("name")}
            value={row.name}
            onChange={(event) =>
              onChange({
                name:
                  event.target.value,
              })
            }
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={id("price")}
          >
            Price (Rs)
          </Label>

          <Input
            id={id("price")}
            type="number"
            min={0}
            value={row.price}
            onChange={(event) =>
              onChange({
                price:
                  event.target.value,
              })
            }
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={id("cat")}
          >
            Category
          </Label>

          <Input
            id={id("cat")}
            list="bulk-categories"
            value={row.category}
            onChange={(event) =>
              onChange({
                category:
                  event.target.value,
              })
            }
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor={id("desc")}
          >
            Description
          </Label>

          <Textarea
            id={id("desc")}
            rows={2}
            value={row.description}
            onChange={(event) =>
              onChange({
                description:
                  event.target.value,
              })
            }
            disabled={disabled}
          />
        </div>
      </div>

      {/* IMAGES */}
      <div className="space-y-2">
        <Label>Images</Label>

        {/* URL INPUT */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Paste image URL (https://…)"
            value={row.urlInput}
            onChange={(event) =>
              onChange({
                urlInput:
                  event.target.value,
              })
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                "Enter"
              ) {
                event.preventDefault();
                onAddUrl();
              }
            }}
            className="min-w-[200px] flex-1"
            disabled={disabled}
          />

          <Button
            type="button"
            variant="goldOutline"
            size="sm"
            onClick={onAddUrl}
            disabled={disabled}
          >
            <Plus className="size-4" />
            Add Image
          </Button>

          <Button
            type="button"
            variant="goldOutline"
            size="sm"
            onClick={() =>
              fileRef.current?.click()
            }
            disabled={
              disabled ||
              uploading
            }
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}

            Upload From Gallery
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              onFiles(
                event.target.files,
              );

              event.target.value = "";
            }}
          />
        </div>

        {/* LIVE URL PREVIEW */}
        {liveUrl && (
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-2">
            <ProductImage
              src={liveUrl}
              alt="Image preview"
              className="size-16 shrink-0 rounded-md object-cover"
            />

            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                Image URL Preview
              </p>

              <p className="truncate text-sm">
                {row.urlInput}
              </p>
            </div>
          </div>
        )}

        {/* UPLOAD PROGRESS */}
        {row.uploads.map(
          (upload) => (
            <div
              key={upload.name}
              className="space-y-1 text-xs text-muted-foreground"
            >
              <div className="flex justify-between">
                <span className="truncate">
                  {upload.name}
                </span>

                <span>
                  {upload.percent}%
                </span>
              </div>

              <Progress
                value={
                  upload.percent
                }
              />
            </div>
          ),
        )}

        {/* SAVED / ADDED IMAGES */}
        {row.images.length >
          0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Product Images (
                {row.images.length})
              </span>

              <span className="text-xs text-muted-foreground">
                First image = Main
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              {row.images.map(
                (url, imageIndex) => (
                  <div
                    key={`${url}-${imageIndex}`}
                    className={cn(
                      "group relative size-20 overflow-hidden rounded-lg border border-border/60",
                      imageIndex === 0 &&
                        "ring-2 ring-primary",
                    )}
                    title={
                      imageIndex ===
                      0
                        ? "Main image"
                        : isStorageUrl(
                            url,
                          )
                          ? "Stored image"
                          : "External image"
                    }
                  >
                    <ProductImage
                      src={url}
                      alt={`Product image ${
                        imageIndex + 1
                      }`}
                      className="size-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveImage(
                          url,
                        )
                      }
                      className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow-sm"
                      aria-label="Remove image"
                      disabled={
                        disabled
                      }
                    >
                      <X className="size-3" />
                    </button>

                    {imageIndex ===
                      0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-background/90 px-1 py-0.5 text-center text-[10px]">
                        Main
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>

            {/* ADD MORE IMAGE */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById(
                    id(
                      "image-url",
                    ),
                  )
                  ?.focus()
              }
              disabled={disabled}
            >
              <Plus className="size-4" />
              Add More Image
            </Button>
          </div>
        )}

        {/* Hidden focus target for Add More Image */}
        <div className="hidden">
          <Input
            id={id("image-url")}
            tabIndex={-1}
          />
        </div>
      </div>

      {/* OPTIONS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Options (e.g. Size, Color)
          </Label>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                options: [
                  ...row.options,
                  {
                    name: "",
                    values: "",
                  },
                ],
              })
            }
            disabled={disabled}
          >
            <Plus className="size-4" />
            Add Option
          </Button>
        </div>

        {row.options.map(
          (option, optionIndex) => (
            <div
              key={optionIndex}
              className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
            >
              <Input
                placeholder="Option name"
                value={option.name}
                onChange={(event) =>
                  setOption(
                    optionIndex,
                    {
                      name:
                        event.target
                          .value,
                    },
                  )
                }
                disabled={disabled}
              />

              <Input
                placeholder="Values, comma separated (S, M, L)"
                value={
                  option.values
                }
                onChange={(event) =>
                  setOption(
                    optionIndex,
                    {
                      values:
                        event.target
                          .value,
                    },
                  )
                }
                disabled={disabled}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  onChange({
                    options:
                      row.options.filter(
                        (
                          _,
                          index,
                        ) =>
                          index !==
                          optionIndex,
                      ),
                  })
                }
                aria-label="Remove option"
                disabled={disabled}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

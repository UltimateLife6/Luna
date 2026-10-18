"use client";

import { useActionState } from "react";
import { deleteProductAction, saveProductAction, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog-store/types";
import { maxCustomizationGroups, maxCustomizationOptions, maxVariants } from "@/lib/catalog-store/validate";

const initialState: FormState = { errors: [] };

const fieldClass = "mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory";

type ProductFormProps = {
  product?: CatalogProduct;
  categories: CatalogCategory[];
  assets: { id: string; shortLabel: string }[];
};

export function ProductForm({ product, categories, assets }: ProductFormProps) {
  const [state, action, pending] = useActionState(saveProductAction, initialState);
  const slots = Array.from({ length: maxVariants }, (_, index) => product?.variants[index]);

  return (
    <form action={action} className="space-y-10" noValidate>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <FormErrors errors={state.errors} />

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-sm text-ivory">
          Name
          <input className={fieldClass} name="name" required maxLength={120} defaultValue={product?.name ?? ""} />
        </label>
        <label className="block text-sm text-ivory">
          Slug
          <input className={fieldClass} name="slug" maxLength={80} defaultValue={product?.slug ?? ""} placeholder="Generated from the name if empty" />
        </label>
      </div>

      <label className="block text-sm text-ivory">
        Summary
        <textarea className={`${fieldClass} min-h-24`} name="summary" required maxLength={280} defaultValue={product?.summary ?? ""} />
      </label>
      <label className="block text-sm text-ivory">
        Description
        <textarea className={`${fieldClass} min-h-36`} name="description" required maxLength={4000} defaultValue={product?.description ?? ""} />
      </label>

      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block text-sm text-ivory">
          Category
          <select className={fieldClass} name="categoryId" defaultValue={product?.categoryId ?? categories[0]?.id ?? ""} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-ivory">
          State
          <select className={fieldClass} name="status" defaultValue={product?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="block text-sm text-ivory sm:col-span-2">
          Purchase
          <select className={fieldClass} name="purchaseMode" defaultValue={product?.purchaseMode ?? "quote-only"}>
            <option value="quote-only">Quote only, outside checkout</option>
            <option value="checkout">Available for checkout</option>
          </select>
        </label>
      </div>

      <fieldset className="space-y-4">
        <legend className="text-sm text-ivory">Made to order</legend>
        <label className="flex min-h-11 items-center gap-3 text-sm text-ivory">
          <input type="checkbox" name="madeToOrder" defaultChecked={product?.madeToOrder ?? false} />
          This record can be made to order when finished inventory is zero.
        </label>
        <label className="block text-sm text-ivory">
          Note stored with this record
          <textarea
            className={`${fieldClass} min-h-24`}
            name="madeToOrderNote"
            maxLength={240}
            defaultValue={product?.madeToOrderNote ?? ""}
            placeholder="Optional. Leave blank when no lead time or terms have been confirmed."
          />
        </label>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="font-editorial text-3xl text-ivory">Customization</legend>
        <p className="max-w-2xl text-sm leading-relaxed text-silver">
          Leave a group blank unless its choices have been confirmed. Nothing is filled in for you. An adjustment is an integer in minor units, and a blank adjustment means no added charge. Choice rows apply to single-choice and multi-choice groups. A text group uses the character limit. A measurement group uses the unit and any minimum or maximum you enter.
        </p>
        {Array.from({ length: maxCustomizationGroups }, (_, groupIndex) => {
          const group = product?.customizationGroups[groupIndex];
          return (
            <div key={group?.id ?? `group-${groupIndex}`} className="space-y-4 border-t border-ivory/10 pt-6">
              {group ? <input type="hidden" name={`group_${groupIndex}_id`} value={group.id} /> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-ivory">
                  Group label
                  <input className={fieldClass} name={`group_${groupIndex}_label`} maxLength={80} defaultValue={group?.label ?? ""} />
                </label>
                <label className="block text-sm text-ivory">
                  Type
                  <select className={fieldClass} name={`group_${groupIndex}_kind`} defaultValue={group?.kind ?? "single"}>
                    <option value="single">Single choice</option>
                    <option value="multi">Multiple choices</option>
                    <option value="text">Text</option>
                    <option value="measurement">Measurement</option>
                  </select>
                </label>
              </div>
              <label className="flex min-h-11 items-center gap-3 text-sm text-ivory">
                <input type="checkbox" name={`group_${groupIndex}_required`} defaultChecked={group ? group.required !== false : true} />
                Required before this product can be added to the cart
              </label>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm text-ivory">
                  Text limit
                  <input className={fieldClass} name={`group_${groupIndex}_text_max`} inputMode="numeric" defaultValue={group?.textMaxLength ? String(group.textMaxLength) : ""} />
                </label>
                <label className="block text-sm text-ivory">
                  Measurement unit
                  <select className={fieldClass} name={`group_${groupIndex}_unit`} defaultValue={group?.unit ?? ""}>
                    <option value="">No unit saved</option>
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                  </select>
                </label>
                <label className="block text-sm text-ivory">
                  Minimum
                  <input className={fieldClass} name={`group_${groupIndex}_min`} inputMode="decimal" defaultValue={group?.min ?? ""} />
                </label>
                <label className="block text-sm text-ivory">
                  Maximum
                  <input className={fieldClass} name={`group_${groupIndex}_max`} inputMode="decimal" defaultValue={group?.max ?? ""} />
                </label>
              </div>
              {Array.from({ length: maxCustomizationOptions }, (_, optionIndex) => {
                const option = group?.options[optionIndex];
                return (
                  <div key={option?.id ?? `group-${groupIndex}-option-${optionIndex}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {option ? <input type="hidden" name={`group_${groupIndex}_option_${optionIndex}_id`} value={option.id} /> : null}
                    <label className="block text-sm text-ivory">
                      Option label
                      <input className={fieldClass} name={`group_${groupIndex}_option_${optionIndex}_label`} maxLength={80} defaultValue={option?.label ?? ""} />
                    </label>
                    <label className="block text-sm text-ivory">
                      Adjustment in minor units
                      <input
                        className={fieldClass}
                        name={`group_${groupIndex}_option_${optionIndex}_price`}
                        inputMode="numeric"
                        defaultValue={option ? String(option.priceAdjustmentMinor) : ""}
                      />
                    </label>
                    <label className="flex min-h-11 items-center gap-3 text-sm text-ivory">
                      <input
                        type="checkbox"
                        name={`group_${groupIndex}_option_${optionIndex}_available`}
                        defaultChecked={option ? option.available !== false : true}
                      />
                      Available
                    </label>
                  </div>
                );
              })}
            </div>
          );
        })}
      </fieldset>

      <fieldset className="space-y-8">
        <legend className="font-editorial text-3xl text-ivory">Variants</legend>
        <p className="max-w-2xl text-sm leading-relaxed text-silver">
          Price is an integer in minor units. For USD, 12500 means $125.00. Inventory is a whole number of finished pieces. Leave a row blank to skip it. Publishing requires at least one complete row.
        </p>
        {slots.map((variant, index) => (
          <div key={variant?.id ?? `slot-${index}`} className="grid gap-4 border-t border-ivory/10 pt-6 sm:grid-cols-2 lg:grid-cols-6">
            {variant ? <input type="hidden" name={`variant_${index}_id`} value={variant.id} /> : null}
            <label className="block text-sm text-ivory lg:col-span-2">
              Label
              <input className={fieldClass} name={`variant_${index}_label`} maxLength={80} defaultValue={variant?.label ?? ""} />
            </label>
            <label className="block text-sm text-ivory lg:col-span-2">
              SKU
              <input className={fieldClass} name={`variant_${index}_sku`} maxLength={41} defaultValue={variant?.skuAssigned ? variant.sku : ""} placeholder="Optional" />
            </label>
            <label className="block text-sm text-ivory">
              Price in cents
              <input className={fieldClass} name={`variant_${index}_price`} inputMode="numeric" defaultValue={variant ? String(variant.priceMinor) : ""} />
            </label>
            <label className="block text-sm text-ivory">
              Inventory
              <input className={fieldClass} name={`variant_${index}_inventory`} inputMode="numeric" defaultValue={variant ? String(variant.inventoryCount) : ""} />
            </label>
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-editorial text-3xl text-ivory">Photographs</legend>
        <p className="max-w-2xl text-sm leading-relaxed text-silver">
          These are ledger references. Files stay outside the public folder. A selected photograph is a reference unless you also mark that it depicts this product. At most eight can be attached.
        </p>
        <ul className="divide-y divide-ivory/10 border-y border-ivory/10">
          {assets.map((asset) => {
            const attached = product?.images.find((image) => image.assetId === asset.id);

            return (
              <li key={asset.id} className="grid gap-3 py-4 sm:grid-cols-2">
                <label className="flex min-h-11 items-center gap-3 text-sm text-ivory">
                  <input type="checkbox" name={`image_${asset.id}`} defaultChecked={Boolean(attached)} />
                  {asset.shortLabel}
                </label>
                <label className="flex min-h-11 items-center gap-3 text-sm text-silver">
                  <input type="checkbox" name={`depict_${asset.id}`} defaultChecked={attached?.depictsProduct ?? false} />
                  Depicts this product
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Save record"}
      </Button>
    </form>
  );
}

export function DeleteProductForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(deleteProductAction, initialState);

  return (
    <form action={action} className="mt-10 border-t border-ivory/10 pt-8">
      <FormErrors errors={state.errors} />
      <input type="hidden" name="id" value={productId} />
      <p className="max-w-xl text-sm leading-relaxed text-silver">Published records stay in the catalog until they are archived or returned to draft.</p>
      <div className="mt-5">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Deleting" : "Delete draft or archived record"}
        </Button>
      </div>
    </form>
  );
}

function FormErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div role="alert" className="border border-burgundy px-4 py-3 text-sm text-ivory">
      <p className="eyebrow">The record was not saved</p>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

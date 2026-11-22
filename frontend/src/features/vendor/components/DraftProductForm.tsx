"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CheckCircle2, Info, Layers, Loader2, Plus, Save, Tag, Trash2, FileText, Images } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { getCategories } from "@/features/category/api/category.api";
import { cn } from "@/lib/utils";
import { uploadProductImage } from "../api/vendor-product.api";
import type { DraftProductInput, VendorCategoryRef, VendorDraftProduct } from "../types/vendor-product.types";
import {
  OFFER_STATUS_BADGES,
  PRODUCT_LIMITS,
  emptyErrors,
  formatQuantity,
  formatVnd,
  mapProductMessages,
  newVariant,
  validateProductForm,
} from "../utils/vendor-product-form";
import type { ProductFormErrors, ProductFormValues, VariantField, VariantFormValues } from "../utils/vendor-product-form";
import { OfferAmountField } from "./OfferAmountField";
import { ProductImagesField } from "./ProductImagesField";
import { dialogButton, fieldClass } from "./VendorDialog";

interface DraftProductFormProps {
  mode: "create" | "edit";
  token: string;
  initial: ProductFormValues;
  /** Categories already on the draft, kept selectable even if no longer listed. */
  initialCategories?: VendorCategoryRef[];
  uploadEnabled: boolean;
  readOnly: boolean;
  submit: (input: DraftProductInput) => Promise<VendorDraftProduct>;
  onSaved: (product: VendorDraftProduct) => void;
  /** Shown after a successful save in edit mode. */
  success?: string | null;
}

/** Proposal form for a new product, grouped like the mockup but with real fields only. */
export function DraftProductForm({
  mode,
  token,
  initial,
  initialCategories = [],
  uploadEnabled,
  readOnly,
  submit,
  onSaved,
  success,
}: DraftProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(initial);
  const [errors, setErrors] = useState<ProductFormErrors>(emptyErrors);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [categories, setCategories] = useState<VendorCategoryRef[]>(initialCategories);
  const [categoriesError, setCategoriesError] = useState(false);

  useEffect(() => {
    let current = true;
    getCategories()
      .then((list) => {
        if (!current) return;
        const listed = list.map(({ id, name }) => ({ id, name }));
        const extra = initialCategories.filter((category) => !listed.some((item) => item.id === category.id));
        setCategories([...listed, ...extra]);
      })
      .catch(() => current && setCategoriesError(true));
    return () => {
      current = false;
    };
    // The draft's own categories only matter for the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disabled = readOnly || submitting;

  function patch(changes: Partial<ProductFormValues>, clear: keyof Omit<ProductFormErrors, "variantRows">) {
    setValues((current) => ({ ...current, ...changes }));
    setErrors((current) => ({ ...current, [clear]: undefined }));
  }

  function patchVariant(index: number, changes: Partial<VariantFormValues>, field: VariantField) {
    setValues((current) => ({
      ...current,
      variants: current.variants.map((variant, i) => (i === index ? { ...variant, ...changes } : variant)),
    }));
    setErrors((current) => {
      const row = current.variantRows[index];
      if (!row?.[field]) return current;
      return { ...current, variantRows: { ...current.variantRows, [index]: { ...row, [field]: undefined } } };
    });
  }

  function removeVariant(index: number) {
    setValues((current) => ({ ...current, variants: current.variants.filter((_, i) => i !== index) }));
    // Row errors are indexed by position, so they no longer line up.
    setErrors((current) => ({ ...current, variantRows: {}, variants: undefined }));
  }

  function toggleCategory(id: string) {
    const selected = values.categoryIds.includes(id)
      ? values.categoryIds.filter((categoryId) => categoryId !== id)
      : [...values.categoryIds, id];
    patch({ categoryIds: selected }, "categoryIds");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled || uploadCount > 0) return;
    const { errors: clientErrors, input } = validateProductForm(values);
    setErrors(clientErrors);
    setFormError(null);
    if (!input) {
      setFormError("Vui lòng kiểm tra lại các trường được đánh dấu.");
      return;
    }

    setSubmitting(true);
    try {
      onSaved(await submit(input));
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = mapProductMessages(error.messages);
        setErrors(mapped.errors);
        const placed = error.messages.length - mapped.other.length;
        setFormError(mapped.other.join(" ") || (placed > 0 ? "Vui lòng kiểm tra lại các trường được đánh dấu." : error.message));
      } else {
        setFormError("Không thể lưu sản phẩm. Vui lòng thử lại.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <legend className="sr-only">Thông tin sản phẩm</legend>

        <Section icon={FileText} title="Thông tin cơ bản" description="Tên và mô tả hiển thị trên trang sản phẩm sau khi được duyệt.">
          <div className="space-y-4">
            <div className="min-w-0">
              <label htmlFor="product-name" className="text-sm font-semibold text-slate-800">
                Tên sản phẩm<span className="text-rose-600"> *</span>
              </label>
              <input
                id="product-name"
                value={values.name}
                maxLength={PRODUCT_LIMITS.nameMax}
                onChange={(event) => patch({ name: event.target.value }, "name")}
                placeholder="Ví dụ: Tôm hùm bông Nha Trang"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "product-name-error" : undefined}
                className={fieldClass(Boolean(errors.name), "mt-1.5")}
              />
              <FieldError id="product-name-error" message={errors.name} />
            </div>
            <div className="min-w-0">
              <label htmlFor="product-description" className="text-sm font-semibold text-slate-800">
                Mô tả sản phẩm
              </label>
              <textarea
                id="product-description"
                rows={5}
                value={values.description}
                onChange={(event) => patch({ description: event.target.value }, "description")}
                placeholder="Nguồn gốc, cách bảo quản, đặc điểm nổi bật..."
                aria-invalid={Boolean(errors.description)}
                aria-describedby="product-description-count product-description-error"
                className={fieldClass(Boolean(errors.description), "mt-1.5 resize-y")}
              />
              <div className="mt-1 flex justify-between gap-3">
                <FieldError id="product-description-error" message={errors.description} />
                <p
                  id="product-description-count"
                  className={cn(
                    "ml-auto shrink-0 text-xs tabular-nums",
                    values.description.trim().length > PRODUCT_LIMITS.descriptionMax ? "text-rose-700" : "text-slate-500",
                  )}
                >
                  {values.description.trim().length}/{PRODUCT_LIMITS.descriptionMax}
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section icon={Tag} title="Danh mục" description={`Chọn từ 1 đến ${PRODUCT_LIMITS.categoriesMax} danh mục phù hợp.`} required>
          {categoriesError ? (
            <p role="alert" className="text-sm text-rose-700">
              Không thể tải danh mục. Vui lòng tải lại trang.
            </p>
          ) : categories.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-slate-500" role="status">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Đang tải danh mục...
            </p>
          ) : (
            <div role="group" aria-label="Danh mục" aria-describedby={errors.categoryIds ? "product-categories-error" : undefined} className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const checked = values.categoryIds.includes(category.id);
                return (
                  <label
                    key={category.id}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40",
                      checked ? "border-brand bg-brand-soft/40 font-semibold text-brand" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleCategory(category.id)} />
                    {category.name}
                  </label>
                );
              })}
            </div>
          )}
          <FieldError id="product-categories-error" message={errors.categoryIds} />
        </Section>

        <Section icon={Images} title="Hình ảnh sản phẩm">
          <ProductImagesField
            images={values.images}
            error={errors.images}
            uploadEnabled={uploadEnabled && !readOnly}
            disabled={disabled}
            upload={(file) => uploadProductImage(token, file)}
            onChange={(images) => patch({ images }, "images")}
            onUploadingChange={(uploading) => setUploadCount((count) => count + (uploading ? 1 : -1))}
          />
        </Section>

        <Section
          icon={Layers}
          title="Biến thể và giá bán"
          description="Mỗi biến thể là một quy cách bán (ví dụ loại 1, size 1 - 1.2 kg/con). Nhập giá và tồn kho để bán ngay khi sản phẩm được duyệt, hoặc bỏ trống để thêm sau."
          required
        >
          <ul className="space-y-3">
            {values.variants.map((variant, index) => (
              <VariantRow
                key={variant.key}
                index={index}
                variant={variant}
                errors={errors.variantRows[index] ?? {}}
                canRemove={values.variants.length > 1 && variant.removable && !readOnly}
                disabled={disabled}
                onChange={(changes, field) => patchVariant(index, changes, field)}
                onRemove={() => removeVariant(index)}
              />
            ))}
          </ul>
          <FieldError id="product-variants-error" message={errors.variants} />
          {!readOnly && values.variants.length < PRODUCT_LIMITS.variantsMax && (
            <button
              type="button"
              onClick={() => setValues((current) => ({ ...current, variants: [...current.variants, newVariant()] }))}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Thêm biến thể
            </button>
          )}
        </Section>
      </fieldset>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="flex gap-2 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
          Sản phẩm hiển thị trên sàn ngay sau khi bạn đăng. Bạn có thể quay lại chỉnh sửa thông tin sản phẩm này sau.
        </p>
        {formError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {formError}
          </p>
        )}
        {success && !formError && (
          <p role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {success}
          </p>
        )}
        {!readOnly && (
          <div className="flex justify-end">
            <button type="submit" disabled={submitting || uploadCount > 0} className={dialogButton.primary}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? "Đang lưu..." : mode === "create" ? "Đăng sản phẩm" : "Lưu thay đổi"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  required,
  children,
}: {
  icon: typeof Info;
  title: string;
  description?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Icon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          {title}
          {required && <span className="text-rose-600">*</span>}
        </h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

interface VariantRowProps {
  index: number;
  variant: VariantFormValues;
  errors: Partial<Record<VariantField, string>>;
  canRemove: boolean;
  disabled: boolean;
  onChange: (changes: Partial<VariantFormValues>, field: VariantField) => void;
  onRemove: () => void;
}

function VariantRow({ index, variant, errors, canRemove, disabled, onChange, onRemove }: VariantRowProps) {
  const prefix = `variant-${variant.key}`;
  const text = (field: "name" | "unit" | "sizeLabel", label: string, required: boolean, max: number, placeholder: string) => (
    <div className="min-w-0">
      <label htmlFor={`${prefix}-${field}`} className="text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      <input
        id={`${prefix}-${field}`}
        value={variant[field]}
        maxLength={max}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange({ [field]: event.target.value }, field)}
        aria-invalid={Boolean(errors[field])}
        aria-describedby={errors[field] ? `${prefix}-${field}-error` : undefined}
        className={fieldClass(Boolean(errors[field]), "mt-1")}
      />
      <FieldError id={`${prefix}-${field}-error`} message={errors[field]} />
    </div>
  );

  return (
    <li className="min-w-0 rounded-xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">Biến thể {index + 1}</p>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Xóa
          </button>
        ) : (
          !variant.removable && <span className="text-xs text-slate-500">Đã có trong giỏ hoặc đơn hàng, không thể xóa</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {text("name", "Tên biến thể", true, PRODUCT_LIMITS.variantNameMax, "Loại 1")}
        {text("unit", "Đơn vị tính", true, PRODUCT_LIMITS.unitMax, "kg, con, hộp")}
        {text("sizeLabel", "Kích cỡ", false, PRODUCT_LIMITS.sizeLabelMax, "1 - 1.2 kg/con")}
      </div>
      {variant.id ? (
        <p className="mt-3 text-xs text-slate-600">
          {variant.existingOffer ? (
            <>
              Giá của bạn: <span className="font-semibold text-slate-900">{formatVnd(variant.existingOffer.price)}</span> · Tồn kho:{" "}
              <span className="font-semibold text-slate-900">{formatQuantity(variant.existingOffer.stock)}</span> ·{" "}
              {OFFER_STATUS_BADGES[variant.existingOffer.status].label}. Sửa giá và tồn kho trong danh sách sản phẩm.
            </>
          ) : (
            "Bạn chưa bán biến thể này. Thêm giá và tồn kho từ trang thêm sản phẩm có sẵn."
          )}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OfferAmountField
            kind="price"
            compact
            required={false}
            label="Giá bán của bạn (đ)"
            value={variant.price}
            error={errors.price}
            disabled={disabled}
            onChange={(price) => onChange({ price }, "price")}
          />
          <OfferAmountField
            kind="stock"
            compact
            required={false}
            unit={variant.unit.trim() || undefined}
            value={variant.stock}
            error={errors.stock}
            disabled={disabled}
            onChange={(stock) => onChange({ stock }, "stock")}
          />
        </div>
      )}
    </li>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-rose-700">
      {message}
    </p>
  );
}

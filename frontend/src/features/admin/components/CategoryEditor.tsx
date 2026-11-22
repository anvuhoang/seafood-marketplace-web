"use client";

import { FormEvent, useState } from "react";
import { ImageOff, Loader2, PencilLine, Plus } from "lucide-react";
import { AdminCategory, CategoryInput } from "../types/admin-category.types";

const NAME_MIN = 2;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 1000;

interface CategoryEditorProps {
  /** The category being edited, or null to create one. */
  category: AdminCategory | null;
  /** Parent preselected by the "add subcategory" button. */
  defaultParentId: string | null;
  /** Every category, to offer the top-level ones as a parent. */
  all: AdminCategory[];
  onCancel: () => void;
  /** Resolves once saved; rejects with a readable message otherwise. */
  onSubmit: (input: CategoryInput) => Promise<void>;
}

const FIELD =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-ink focus:ring-2 focus:ring-brand-ink/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const LABEL = "text-sm font-semibold text-slate-800";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** The side panel for adding and editing a category. */
export function CategoryEditor({ category, defaultParentId, all, onCancel, onSubmit }: CategoryEditorProps) {
  const editing = category !== null;
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? defaultParentId ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [brokenImage, setBrokenImage] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Two levels only: a parent must be top-level, and a category with children stays top-level.
  const hasChildren = (category?.childCount ?? 0) > 0;
  const parents = all.filter((item) => item.parentId === null && item.id !== category?.id);

  const trimmedName = name.trim();
  const trimmedImage = imageUrl.trim();
  const order = Number(sortOrder);
  const showPreview = isHttpUrl(trimmedImage) && brokenImage !== trimmedImage;

  const problems = {
    name:
      trimmedName.length < NAME_MIN
        ? `Tên cần ít nhất ${NAME_MIN} ký tự.`
        : trimmedName.length > NAME_MAX
          ? `Tên tối đa ${NAME_MAX} ký tự.`
          : null,
    image: trimmedImage && !isHttpUrl(trimmedImage) ? "Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://." : null,
    order: sortOrder.trim() === "" || !Number.isInteger(order) || order < 0 || order > 9999 ? "Thứ tự là số nguyên từ 0 đến 9999." : null,
  };
  const invalid = Boolean(problems.name || problems.image || problems.order);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (invalid || busy) return;

    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim() || null,
        imageUrl: trimmedImage || null,
        parentId: parentId || null,
        sortOrder: order,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu danh mục. Vui lòng thử lại.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {editing ? "Đang chỉnh sửa" : "Danh mục mới"}
          </p>
          <h2 className="mt-1 text-lg leading-snug font-semibold text-slate-900">
            {editing ? category.name : "Thêm danh mục"}
          </h2>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-brand-ink" aria-hidden>
          {editing ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="category-name" className={LABEL}>
              Tên danh mục <span className="text-danger">*</span>
            </label>
            <span className="text-xs text-slate-500">Tối đa {NAME_MAX} ký tự</span>
          </div>
          <input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={NAME_MAX + 20}
            aria-invalid={touched && Boolean(problems.name)}
            className={FIELD}
            placeholder="Ví dụ: Tôm sống"
          />
          {touched && problems.name && <p className="mt-1 text-xs text-danger">{problems.name}</p>}
        </div>

        <div>
          <p className={LABEL}>Đường dẫn</p>
          <p className="mt-1.5 rounded-lg bg-slate-100 px-3 py-2.5 font-mono text-xs break-all text-slate-600">
            {editing ? `/categories/${category.slug}` : "Tự tạo từ tên danh mục"}
          </p>
          {editing && <p className="mt-1 text-xs text-slate-500">Giữ nguyên khi đổi tên để liên kết cũ vẫn dùng được.</p>}
        </div>

        <div>
          <label htmlFor="category-parent" className={LABEL}>
            Danh mục cha
          </label>
          <select
            id="category-parent"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
            disabled={hasChildren}
            className={FIELD}
          >
            <option value="">Không có (danh mục gốc)</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isActive ? "" : " (đang ẩn)"}
              </option>
            ))}
          </select>
          {hasChildren && <p className="mt-1 text-xs text-slate-500">Danh mục đang có danh mục con nên luôn là danh mục gốc.</p>}
        </div>

        <div>
          <label htmlFor="category-image" className={LABEL}>
            Ảnh đại diện
          </label>
          <div className="mt-1.5 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
              {showPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={trimmedImage}
                  alt="Xem trước ảnh danh mục"
                  className="h-full w-full object-cover"
                  onError={() => setBrokenImage(trimmedImage)}
                />
              ) : (
                <ImageOff className="h-5 w-5" aria-hidden />
              )}
            </span>
            <input
              id="category-image"
              type="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              aria-invalid={touched && Boolean(problems.image)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-ink focus:ring-2 focus:ring-brand-ink/15"
              placeholder="https://..."
            />
          </div>
          {touched && problems.image && <p className="mt-1 text-xs text-danger">{problems.image}</p>}
        </div>

        <div>
          <label htmlFor="category-description" className={LABEL}>
            Mô tả
          </label>
          <textarea
            id="category-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={4}
            className={`${FIELD} resize-none`}
            placeholder="Giới thiệu ngắn hiển thị cho khách hàng"
          />
        </div>

        <div>
          <label htmlFor="category-order" className={LABEL}>
            Thứ tự hiển thị
          </label>
          <input
            id="category-order"
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-invalid={touched && Boolean(problems.order)}
            className={FIELD}
          />
          {touched && problems.order ? (
            <p className="mt-1 text-xs text-danger">{problems.order}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Số nhỏ hơn đứng trước.</p>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-[#fff] transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Lưu thay đổi" : "Thêm danh mục"}
          </button>
        </div>
      </div>
    </form>
  );
}

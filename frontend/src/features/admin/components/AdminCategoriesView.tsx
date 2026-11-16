"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CirclePlus,
  CornerDownRight,
  EyeOff,
  FolderTree,
  Info,
  Network,
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  setCategoryActive,
  updateCategory,
} from "../api/admin-category.api";
import { AdminCategory, AdminCategoryList, CategoryInput } from "../types/admin-category.types";
import { formatCount } from "../utils/format";
import { CategoryConfirmDialog } from "./CategoryConfirmDialog";
import { CategoryEditor } from "./CategoryEditor";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type Result = { run: number; data: AdminCategoryList } | { run: number; error: string };
type ConfirmState = { kind: "hide" | "show" | "delete"; category: AdminCategory } | null;

/** What the side panel works on. `form` restarts the fields, e.g. after a save. */
interface EditorState {
  editingId: string | null;
  parentId: string | null;
  form: number;
}

/** Lowercase and accent-free, so "tom" finds "Tôm sống". */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

interface Row {
  category: AdminCategory;
  isChild: boolean;
  /** Subcategories on screen under this row. */
  visibleChildren: number;
}

/** Parents followed by their children. A child whose parent is filtered out is shown on its own. */
function arrange(items: AdminCategory[], collapsed: Set<string>): Row[] {
  const ids = new Set(items.map((item) => item.id));
  const childrenOf = new Map<string, AdminCategory[]>();
  for (const item of items) {
    if (item.parentId && ids.has(item.parentId)) {
      childrenOf.set(item.parentId, [...(childrenOf.get(item.parentId) ?? []), item]);
    }
  }

  const rows: Row[] = [];
  for (const item of items) {
    if (item.parentId && ids.has(item.parentId)) continue;
    const children = childrenOf.get(item.id) ?? [];
    rows.push({ category: item, isChild: false, visibleChildren: children.length });
    if (collapsed.has(item.id)) continue;
    for (const child of children) rows.push({ category: child, isChild: true, visibleChildren: 0 });
  }
  return rows;
}

export function AdminCategoriesView() {
  const { accessToken } = useAuth();
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [lastData, setLastData] = useState<AdminCategoryList | null>(null);
  const [editor, setEditor] = useState<EditorState>({ editingId: null, parentId: null, form: 0 });
  const [editorOpenOnMobile, setEditorOpenOnMobile] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getAdminCategories(accessToken)
      .then((data) => !cancelled && setResult({ run, data }))
      .catch((err) => !cancelled && setResult({ run, error: err instanceof Error ? err.message : "Không tải được danh mục." }));
    return () => {
      cancelled = true;
    };
  }, [accessToken, run]);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  // Keep the last good list on screen while a refresh is in flight.
  if (result && "data" in result && result.data !== lastData) setLastData(result.data);

  const loading = !result || result.run !== run;
  const error = result && result.run === run && "error" in result ? result.error : null;
  const data = lastData;

  const needle = fold(search.trim());
  const rows = useMemo(() => {
    if (!data) return [];
    return arrange(
      data.items.filter((item) => {
        if (filter === "ACTIVE" && !item.isActive) return false;
        if (filter === "INACTIVE" && item.isActive) return false;
        return !needle || fold(item.name).includes(needle);
      }),
      collapsed,
    );
  }, [data, filter, needle, collapsed]);

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      roots: items.filter((item) => item.parentId === null).length,
      children: items.filter((item) => item.parentId !== null).length,
      tags: items.reduce((sum, item) => sum + item.productCount, 0),
      hidden: data?.counts.inactive ?? 0,
    };
  }, [data]);

  const editingCategory = data?.items.find((item) => item.id === editor.editingId) ?? null;

  const openEditor = (editingId: string | null, parentId: string | null = null) => {
    setEditor((current) => ({ editingId, parentId, form: current.form + 1 }));
    setEditorOpenOnMobile(true);
    // The panel sits above the list on small screens, so bring it into view.
    requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 1279px)").matches) panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const closeEditor = () => {
    setEditor((current) => ({ editingId: null, parentId: null, form: current.form + 1 }));
    setEditorOpenOnMobile(false);
  };

  const announce = (message: string) => {
    setRun((value) => value + 1);
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  };

  const save = async (input: CategoryInput) => {
    if (editingCategory) await updateCategory(accessToken!, editingCategory.id, input);
    else await createCategory(accessToken!, input);
    closeEditor();
    announce(editingCategory ? `Đã cập nhật danh mục "${input.name}".` : `Đã thêm danh mục "${input.name}".`);
  };

  const confirmAction = async () => {
    if (!confirm) return;
    const { kind, category } = confirm;
    if (kind === "delete") {
      await deleteCategory(accessToken!, category.id);
      if (editor.editingId === category.id) closeEditor();
      announce(`Đã xóa danh mục "${category.name}".`);
    } else {
      await setCategoryActive(accessToken!, category.id, kind === "show");
      announce(kind === "show" ? `Đã hiển thị lại "${category.name}".` : `Đã ẩn "${category.name}".`);
    }
    setConfirm(null);
  };

  const toggleCollapsed = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <section className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="rounded bg-sky-100 px-2 py-1 text-[11px] font-semibold tracking-wide text-sky-800 uppercase">
            Danh mục sàn
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Quản lý danh mục hải sản</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Sắp xếp nhóm hải sản theo cha con, chỉnh thông tin hiển thị và ẩn những danh mục không còn dùng với khách hàng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(null)}
          disabled={!data}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-[#C62835] px-5 text-sm font-semibold text-[#fff] transition-colors hover:bg-[#A8202C] disabled:opacity-60 lg:self-auto"
        >
          <Plus className="h-4 w-4" />
          Thêm danh mục mới
        </button>
      </section>

      <section aria-label="Số liệu danh mục" className="mt-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Tile label="Danh mục gốc" value={stats.roots} icon={<FolderTree className="h-5 w-5" />} />
        <Tile label="Danh mục con" value={stats.children} icon={<Network className="h-5 w-5" />} />
        <Tile label="Lượt gắn sản phẩm" value={stats.tags} icon={<Package className="h-5 w-5" />} />
        <Tile label="Đang ẩn" value={stats.hidden} icon={<EyeOff className="h-5 w-5" />} />
      </section>

      {notice && (
        <p role="status" className="animate-fade-in mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center">
            <div role="search" className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên danh mục"
                aria-label="Tìm danh mục"
                className="h-10 w-full rounded-lg bg-slate-100 pr-3 pl-9 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-500 focus:ring-2 focus:ring-brand-ink/25"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span className="shrink-0">Lọc trạng thái:</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as StatusFilter)}
                className="h-10 min-w-0 flex-1 rounded-lg bg-slate-100 px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand-ink/25 sm:flex-none"
              >
                <option value="ALL">Tất cả ({data?.counts.total ?? 0})</option>
                <option value="ACTIVE">Đang hiển thị ({data?.counts.active ?? 0})</option>
                <option value="INACTIVE">Đã ẩn ({data?.counts.inactive ?? 0})</option>
              </select>
            </label>
          </div>

          <div aria-busy={loading}>
            {error && !data ? (
              <p role="alert" className="rounded-xl border border-dashed border-red-200 p-10 text-center text-sm text-danger">
                {error}
              </p>
            ) : !data ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-hidden>
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-0">
                    <div className="shimmer h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="shimmer h-4 w-1/3 rounded" />
                      <div className="shimmer h-3 w-1/4 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Tags className="h-7 w-7" />
                </span>
                <p className="mt-3 font-semibold text-slate-800">Không có danh mục nào</p>
                <p className="mt-1 text-sm text-slate-500">
                  {needle ? "Thử từ khóa khác." : data.counts.total === 0 ? "Bấm Thêm danh mục mới để tạo danh mục đầu tiên." : "Chưa có danh mục ở trạng thái này."}
                </p>
              </div>
            ) : (
              <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white transition-opacity ${loading ? "opacity-60" : ""}`}>
                {error && (
                  <p role="alert" className="bg-red-50 px-4 py-2 text-sm text-danger">
                    {error} Đang hiển thị danh sách lần tải trước.
                  </p>
                )}
                <table className="w-full table-fixed text-sm">
                  <caption className="sr-only">Danh sách danh mục hải sản</caption>
                  <thead className="bg-sky-50 text-left text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3">Danh mục</th>
                      <th scope="col" className="hidden w-28 px-2 py-3 md:table-cell">Sản phẩm</th>
                      <th scope="col" className="hidden w-20 px-2 py-3 text-center md:table-cell">Thứ tự</th>
                      <th scope="col" className="w-16 px-1 py-3 text-center sm:w-20 sm:px-2">Hiển thị</th>
                      <th scope="col" className="w-28 px-2 py-3 text-right sm:w-36 sm:px-3">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <CategoryRow
                        key={row.category.id}
                        row={row}
                        selected={editor.editingId === row.category.id}
                        collapsed={collapsed.has(row.category.id)}
                        onToggleCollapsed={() => toggleCollapsed(row.category.id)}
                        onAddChild={() => openEditor(null, row.category.id)}
                        onEdit={() => openEditor(row.category.id)}
                        onToggleActive={() => setConfirm({ kind: row.category.isActive ? "hide" : "show", category: row.category })}
                        onDelete={() => setConfirm({ kind: "delete", category: row.category })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="flex gap-2.5 rounded-xl bg-sky-50 p-4 text-sm leading-relaxed text-slate-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" aria-hidden />
            <span>
              <span className="font-semibold text-slate-900">Danh mục đang có sản phẩm không thể xóa.</span> Hãy ẩn danh mục đó: khách hàng không còn thấy nó và các danh mục con, còn sản phẩm vẫn giữ nguyên nhãn.
            </span>
          </p>
        </div>

        <div
          ref={panel}
          className={`order-first scroll-mt-32 xl:sticky xl:top-20 xl:order-last xl:block ${editorOpenOnMobile ? "" : "hidden"}`}
        >
          {data && (
            <CategoryEditor
              key={editor.form}
              category={editingCategory}
              defaultParentId={editor.parentId}
              all={data.items}
              onCancel={closeEditor}
              onSubmit={save}
            />
          )}
        </div>
      </div>

      {confirm && (
        <CategoryConfirmDialog
          title={confirm.kind === "delete" ? "Xóa danh mục?" : confirm.kind === "hide" ? "Ẩn danh mục?" : "Hiển thị lại danh mục?"}
          categoryName={confirm.category.name}
          message={
            confirm.kind === "delete"
              ? "Danh mục sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
              : confirm.kind === "hide"
                ? `Khách hàng sẽ không còn thấy danh mục${confirm.category.childCount > 0 ? " và các danh mục con" : ""}. Sản phẩm vẫn giữ nguyên nhãn danh mục.`
                : "Khách hàng sẽ thấy danh mục này trở lại trên sàn."
          }
          confirmLabel={confirm.kind === "delete" ? "Xóa danh mục" : confirm.kind === "hide" ? "Ẩn danh mục" : "Hiển thị lại"}
          destructive={confirm.kind !== "show"}
          onCancel={() => setConfirm(null)}
          onConfirm={confirmAction}
        />
      )}
    </>
  );
}

function Tile({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{formatCount(value)}</p>
      </div>
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-brand-ink sm:flex" aria-hidden>
        {icon}
      </span>
    </div>
  );
}

function CategoryThumb({ category, size }: { category: AdminCategory; size: "lg" | "sm" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "lg" ? "h-12 w-12" : "h-9 w-9";

  if (category.imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={category.imageUrl}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className={`${box} hidden shrink-0 rounded-lg object-cover sm:block ${category.isActive ? "" : "opacity-50 grayscale"}`}
      />
    );
  }
  return (
    <span className={`${box} hidden shrink-0 items-center justify-center rounded-lg bg-slate-100 sm:flex text-sm font-semibold text-brand-ink`} aria-hidden>
      {category.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function CategoryRow({
  row: { category, isChild, visibleChildren },
  selected,
  collapsed,
  onToggleCollapsed,
  onAddChild,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  row: Row;
  selected: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const deletable = category.productCount === 0 && category.childCount === 0;
  const deleteHint = category.productCount > 0
    ? `Không thể xóa: đang có ${category.productCount} sản phẩm. Hãy ẩn danh mục.`
    : category.childCount > 0
      ? "Không thể xóa: còn danh mục con."
      : `Xóa ${category.name}`;
  const canHaveChildren = category.parentId === null;

  return (
    <tr className={`transition-colors ${selected ? "bg-sky-50" : "hover:bg-slate-50"}`}>
      <td className={`py-3 pr-2 ${isChild ? "pl-4 sm:pl-12" : "pl-3"}`}>
        <div className="flex items-center gap-2.5">
          {isChild ? (
            <CornerDownRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          ) : visibleChildren > 0 ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? "Mở" : "Thu gọn"} ${category.name}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : (
            <span className="hidden h-7 w-7 shrink-0 sm:block" aria-hidden />
          )}
          <CategoryThumb category={category} size={isChild ? "sm" : "lg"} />
          <div className="min-w-0">
            <p className={`truncate ${isChild ? "font-medium" : "font-semibold"} ${category.isActive ? "text-slate-900" : "text-slate-500"}`} title={category.name}>
              {category.name}
            </p>
            <p className="truncate text-xs text-slate-500">
              <span className="font-mono">/{category.slug}</span>
              <span className="md:hidden"> · {formatCount(category.productCount)} sản phẩm</span>
            </p>
            {!category.isActive && <p className="text-xs font-medium text-slate-500">Đã ẩn</p>}
            {category.hiddenByParent && <p className="text-xs font-medium text-amber-800">Ẩn do danh mục cha</p>}
          </div>
        </div>
      </td>
      <td className="hidden px-2 py-3 font-semibold whitespace-nowrap text-slate-900 tabular-nums md:table-cell">
        {formatCount(category.productCount)}
      </td>
      <td className="hidden px-2 py-3 text-center md:table-cell">
        <span className="rounded bg-sky-50 px-2 py-0.5 text-xs font-semibold text-brand-ink tabular-nums">{category.sortOrder}</span>
      </td>
      <td className="px-1 py-3 text-center sm:px-2">
        <button
          type="button"
          role="switch"
          aria-checked={category.isActive}
          aria-label={`${category.isActive ? "Ẩn" : "Hiển thị lại"} ${category.name}`}
          title={category.isActive ? "Đang hiển thị, bấm để ẩn" : "Đang ẩn, bấm để hiển thị lại"}
          onClick={onToggleActive}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-brand-ink/40 focus-visible:outline-none ${
            category.isActive ? "bg-brand" : "bg-slate-300"
          }`}
        >
          <span className={`h-4.5 w-4.5 rounded-full bg-[#fff] shadow transition-transform ${category.isActive ? "translate-x-[23px]" : "translate-x-[3px]"}`} />
        </button>
      </td>
      <td className="px-2 py-3 sm:px-3">
        <div className="flex items-center justify-end gap-0.5">
          {canHaveChildren && (
            <IconButton label={`Thêm danh mục con cho ${category.name}`} onClick={onAddChild}>
              <CirclePlus className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton label={`Sửa ${category.name}`} onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton label={deleteHint} onClick={onDelete} danger disabled={!deletable}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

function IconButton({
  label,
  onClick,
  danger = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        danger ? "text-danger enabled:hover:bg-red-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

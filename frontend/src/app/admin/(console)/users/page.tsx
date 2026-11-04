import { Users } from "lucide-react";

export const metadata = {
  title: "Quản Lý Người Dùng | HaiSan Express Admin",
  description: "Phân quyền và quản lý tài khoản khách hàng, vựa đối tác và admin.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function AdminUsersPage() {
  const users = [
    {
      id: "usr-1",
      name: "Nguyễn Văn Hải",
      email: "phuquocxanh@haisanexpress.vn",
      role: "VENDOR",
      status: "ACTIVE",
      joined: "15/09/2026",
    },
    {
      id: "usr-2",
      name: "Trần Hoàng Long",
      email: "long.tran@gmail.com",
      role: "CUSTOMER",
      status: "ACTIVE",
      joined: "20/10/2026",
    },
    {
      id: "usr-3",
      name: "Ban Quản Trị Hệ Thống",
      email: "admin@haisanexpress.vn",
      role: "ADMIN",
      status: "ACTIVE",
      joined: "01/01/2026",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-700 text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Quản Lý Tài Khoản & Phân Quyền
            </h1>
            <p className="text-xs text-slate-400">
              Quản lý quyền hạn và trạng thái hoạt động của thành viên
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Tên Thành Viên</th>
              <th className="py-3 px-4">Email / Số Điện Thoại</th>
              <th className="py-3 px-4">Vai Trò</th>
              <th className="py-3 px-4">Ngày Tham Gia</th>
              <th className="py-3 px-4">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/80 transition">
                <td className="py-3.5 px-4 font-bold text-slate-900">
                  {u.name}
                </td>
                <td className="py-3.5 px-4 text-slate-600 font-mono">
                  {u.email}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      u.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : u.role === "VENDOR"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-400">{u.joined}</td>
                <td className="py-3.5 px-4">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    Hoạt động
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


"use client";

import { CrudPage } from "@/components/ui/CrudPage";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { User } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

const roleBadge: Record<string, string> = {
  admin: "badge-confirmed",
  doctor: "badge-completed",
  staff: "badge-pending",
  treasurer: "badge-confirmed",
};

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const q = search ? `?search=${search}` : "";
    apiGet<User[]>(`/users${q}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <CrudPage
      title="User Management"
      searchPlaceholder="Search staff accounts..."
      addLabel="Add User"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "password", label: "Password", type: "password" },
        {
          name: "role",
          label: "Role",
          type: "select",
          required: true,
          options: [
            { value: "admin", label: "Admin" },
            { value: "doctor", label: "Doctor" },
            { value: "staff", label: "Staff" },
            { value: "treasurer", label: "Treasurer" },
          ],
        },
        { name: "phone", label: "Phone" },
      ]}
      items={items}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      getInitialValues={(u) => ({
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone ?? "",
        password: "",
      })}
      columns={[
        { header: "Name", render: (u) => u.name },
        { header: "Email", render: (u) => u.email },
        {
          header: "Role",
          render: (u) => (
            <span className={`badge ${roleBadge[u.role] ?? "badge-confirmed"} capitalize`}>
              {u.role}
            </span>
          ),
        },
        { header: "Phone", render: (u) => u.phone ?? "—" },
      ]}
      onSave={async (data, editing) => {
        if (editing) {
          const payload = { ...data };
          if (!payload.password) delete payload.password;
          await apiPut(`/users/${editing.id}`, payload);
          showToast("User updated");
        } else {
          if (!data.password) {
            showToast("Password is required for new users", "error");
            throw new Error("Password required");
          }
          await apiPost("/users", data);
          showToast("User created");
        }
        load();
      }}
      onDelete={async (item) => {
        const ok = await confirm({
          title: "Delete User",
          message: `Delete user "${item.name}"?`,
          confirmLabel: "Delete",
          danger: true,
        });
        if (!ok) return;
        await apiDelete(`/users/${item.id}`);
        showToast("User deleted");
        load();
      }}
    />
  );
}

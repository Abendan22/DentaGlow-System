"use client";

import { CrudPage } from "@/components/ui/CrudPage";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { Staff } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export default function StaffPage() {
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const q = search ? `?search=${search}` : "";
    apiGet<Staff[]>(`/staff${q}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <CrudPage
      title="Staff"
      searchPlaceholder="Search staff..."
      addLabel="Add Staff"
      fields={[
        { name: "first_name", label: "First Name", required: true },
        { name: "last_name", label: "Last Name", required: true },
        { name: "position", label: "Position", required: true },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      items={items}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      getInitialValues={(s) => ({
        first_name: s.first_name,
        last_name: s.last_name,
        position: s.position,
        phone: s.phone ?? "",
        email: s.email ?? "",
        is_active: s.is_active,
      })}
      columns={[
        { header: "Name", render: (s) => s.full_name },
        { header: "Position", render: (s) => s.position },
        { header: "Phone", render: (s) => s.phone ?? "—" },
        { header: "Email", render: (s) => s.email ?? "—" },
        {
          header: "Status",
          render: (s) => (
            <span className={`badge ${s.is_active ? "badge-completed" : "badge-cancelled"}`}>
              {s.is_active ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
      onSave={async (data, editing) => {
        if (editing) {
          await apiPut(`/staff/${editing.id}`, data);
          showToast("Staff updated");
        } else {
          await apiPost("/staff", data);
          showToast("Staff created");
        }
        load();
      }}
      onDelete={async (item) => {
        const ok = await confirm({
          title: "Delete Staff",
          message: `Delete ${item.full_name}?`,
          confirmLabel: "Delete",
          danger: true,
        });
        if (!ok) return;
        await apiDelete(`/staff/${item.id}`);
        showToast("Staff deleted");
        load();
      }}
    />
  );
}

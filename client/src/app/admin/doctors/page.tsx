"use client";

import { CrudPage } from "@/components/ui/CrudPage";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { DentalDoctor } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export default function DoctorsPage() {
  const [items, setItems] = useState<DentalDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const q = search ? `?search=${search}` : "";
    apiGet<DentalDoctor[]>(`/doctors${q}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <CrudPage
      title="Dental Doctor"
      searchPlaceholder="Search doctors..."
      addLabel="Add Doctor"
      fields={[
        { name: "first_name", label: "First Name", required: true },
        { name: "last_name", label: "Last Name", required: true },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email", type: "email" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      items={items}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      getInitialValues={(d) => ({
        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone ?? "",
        email: d.email ?? "",
        is_active: d.is_active,
      })}
      columns={[
        { header: "Name", render: (d) => d.full_name },
        { header: "Phone", render: (d) => d.phone ?? "—" },
        { header: "Email", render: (d) => d.email ?? "—" },
        {
          header: "Status",
          render: (d) => (
            <span className={`badge ${d.is_active ? "badge-completed" : "badge-cancelled"}`}>
              {d.is_active ? "Active" : "Inactive"}
            </span>
          ),
        },
      ]}
      onSave={async (data, editing) => {
        if (editing) {
          await apiPut(`/doctors/${editing.id}`, data);
          showToast("Doctor updated");
        } else {
          await apiPost("/doctors", data);
          showToast("Doctor created");
        }
        load();
      }}
      onDelete={async (item) => {
        const ok = await confirm({
          title: "Delete Doctor",
          message: `Delete ${item.full_name}?`,
          confirmLabel: "Delete",
          danger: true,
        });
        if (!ok) return;
        await apiDelete(`/doctors/${item.id}`);
        showToast("Doctor deleted");
        load();
      }}
    />
  );
}

"use client";

import { CrudPage } from "@/components/ui/CrudPage";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { Gender } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";

export default function GenderPage() {
  const [items, setItems] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { showToast } = useToast();
  const confirm = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const q = search ? `?search=${search}` : "";
    apiGet<Gender[]>(`/genders${q}`)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <CrudPage
      title="Gender"
      searchPlaceholder="Search gender..."
      addLabel="Add Gender"
      fields={[{ name: "name", label: "Gender Name", required: true }]}
      items={items}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      columns={[{ header: "Name", render: (g) => g.name }]}
      onSave={async (data, editing) => {
        if (editing) {
          await apiPut(`/genders/${editing.id}`, data);
          showToast("Gender updated");
        } else {
          await apiPost("/genders", data);
          showToast("Gender created");
        }
        load();
      }}
      onDelete={async (item) => {
        const ok = await confirm({
          title: "Delete Gender",
          message: "Are you sure you want to delete this gender?",
          confirmLabel: "Delete",
          danger: true,
        });
        if (!ok) return;
        await apiDelete(`/genders/${item.id}`);
        showToast("Gender deleted");
        load();
      }}
    />
  );
}

import { ProjectStatus, TypesFile } from "@pbs/shared";

export async function getProjectStatus(): Promise<ProjectStatus> {
  const res = await fetch("/api/project/status");
  if (!res.ok) {
    throw new Error(`Status failed: ${res.status}`);
  }
  return res.json();
}

export async function getTypes(): Promise<TypesFile> {
  const res = await fetch("/api/pbs/types.txt");
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to load types.txt: ${body}`);
  }
  return res.json();
}

export async function exportTypes(data: TypesFile): Promise<void> {
  const res = await fetch("/api/pbs/types.txt/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Export failed: ${body}`);
  }
}

import { api } from "./client";
import type { ParentProfile } from "@/src/types";

export interface CreateParentInput {
  name: string;
  age: number;
  address: string;
  city: string;
  pincode: string;
  mobilityNotes?: string;
  medicalNotes?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export const parentsApi = {
  list: () =>
    api.get<{ data: ParentProfile[] }>("/api/family/parents"),

  get: (id: string) =>
    api.get<{ data: ParentProfile }>(`/api/family/parents/${id}`),

  create: (input: CreateParentInput) =>
    api.post<{ data: ParentProfile }>("/api/family/parents", input),

  update: (id: string, input: Partial<CreateParentInput>) =>
    api.patch<{ data: ParentProfile }>(`/api/family/parents/${id}`, input),
};

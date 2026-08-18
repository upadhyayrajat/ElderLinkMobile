import { api } from "./client";
import type { FamilyMember, FamilyMemberRole } from "@/src/types";

export interface FamilyMemberWithContact extends FamilyMember {
  name: string;
  phone: string;
}

export interface FamilyMembersResponse {
  owner: { id: null; role: "owner"; userId: string; name: string; phone: string };
  members: FamilyMemberWithContact[];
}

export interface InviteFamilyMemberInput {
  parentProfileId: string;
  phone: string;
  role: Exclude<FamilyMemberRole, "owner">;
}

export const familyMembersApi = {
  list: (parentProfileId: string) =>
    api.get<{ data: FamilyMembersResponse }>(`/api/family/parents/${parentProfileId}/members`),

  invite: (input: InviteFamilyMemberInput) =>
    api.post<{ data: FamilyMemberWithContact }>(
      `/api/family/parents/${input.parentProfileId}/members`,
      { phone: input.phone, role: input.role }
    ),

  updateRole: (parentProfileId: string, memberId: string, role: Exclude<FamilyMemberRole, "owner">) =>
    api.patch<{ data: FamilyMember }>(
      `/api/family/parents/${parentProfileId}/members/${memberId}`,
      { role }
    ),

  remove: (parentProfileId: string, memberId: string) =>
    api.delete(`/api/family/parents/${parentProfileId}/members/${memberId}`),
};

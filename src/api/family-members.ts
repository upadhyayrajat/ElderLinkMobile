import { api } from "./client";
import type { FamilyMember, FamilyMemberRole } from "@/src/types";

export interface InviteFamilyMemberInput {
  parentProfileId: string;
  phone: string;
  role: FamilyMemberRole;
}

export const familyMembersApi = {
  list: (parentProfileId: string) =>
    api.get<{ data: FamilyMember[] }>(`/api/family/parents/${parentProfileId}/members`),

  invite: (input: InviteFamilyMemberInput) =>
    api.post<{ data: FamilyMember }>("/api/family/members/invite", input),

  updateRole: (memberId: string, role: FamilyMemberRole) =>
    api.patch<{ data: FamilyMember }>(`/api/family/members/${memberId}`, { role }),

  remove: (memberId: string) =>
    api.delete(`/api/family/members/${memberId}`),
};

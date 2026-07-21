import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parentsApi, type CreateParentInput } from "@/src/api/parents";

export function useParents() {
  return useQuery({
    queryKey: ["parents"],
    queryFn: () => parentsApi.list().then((r) => r.data.data),
  });
}

export function useParent(id: string) {
  return useQuery({
    queryKey: ["parent", id],
    queryFn: () => parentsApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCreateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParentInput) => parentsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parents"] }),
  });
}

export function useUpdateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateParentInput> }) =>
      parentsApi.update(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["parents"] });
      qc.invalidateQueries({ queryKey: ["parent", id] });
    },
  });
}

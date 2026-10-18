export const inquiryTopics = [
  { id: "work", label: "A question about the work" },
  { id: "commission", label: "The commission demonstration" },
  { id: "shop", label: "Finding the maker’s shop" },
] as const;

export type InquiryTopic = (typeof inquiryTopics)[number]["id"];

export function inquiryTopicLabel(id: InquiryTopic | undefined): string {
  return inquiryTopics.find((topic) => topic.id === id)?.label ?? "Not chosen";
}

import { Container } from "@/components/ui/Container";

export default function Loading() {
  return (
    <Container className="py-24">
      <p className="eyebrow" role="status">
        Loading
      </p>
    </Container>
  );
}

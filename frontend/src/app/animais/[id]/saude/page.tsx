import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AnimalSaudeRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/animais/${id}?tab=saude`);
}

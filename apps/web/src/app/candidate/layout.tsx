import type { Metadata } from "next";
import { CandidateShell } from "@/components/candidate/candidate-shell";

export const metadata: Metadata = {
  title: "Candidate Portal",
};

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <CandidateShell>{children}</CandidateShell>;
}

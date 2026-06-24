"use client";

import { redirect } from "next/navigation";

/**
 * Redirect page — the new application form has been merged into the main
 * applicant dashboard at /dashboard/applicant.
 * This redirect ensures any bookmarked URLs still work.
 */
export default function NewApplicationRedirect() {
  redirect("/dashboard/applicant");
}

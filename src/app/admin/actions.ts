"use server";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CredentialsSignin } from "next-auth";
import { authKit } from "@/auth";
import { adminDenialMessage } from "@/lib/catalog-store/access";
import { CatalogStoreError } from "@/lib/catalog-store/errors";
import { productInputFromForm } from "@/lib/catalog-store/form";
import { slugFromName } from "@/lib/catalog-store/validate";
import { assignableAssetIds, createCategory, deleteCatalogProduct, listCategories, saveCatalogProduct } from "@/lib/data/records";
import { logError } from "@/lib/platform/log";
import { deleteMediaBytes, putMediaBytes } from "@/lib/platform/media-store";
import { inspectImage, isMediaApproval } from "@/lib/platform/media-policy";
import { insertMediaRecord, setMediaApproval } from "@/lib/platform/media-records";
import { currentClientAddress } from "@/lib/ops/client-subject";
import { attemptAllowed, recordAttempt, signInAttemptLimit, trackingSubject } from "@/lib/ops/tracking";
import { applicationSql } from "@/lib/platform/runtime";

export type FormState = { errors: string[] };

function isRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT");
}

export async function loginAction(_state: FormState, formData: FormData): Promise<FormState> {
  await connection();
  const kit = authKit();

  if (!kit) {
    return { errors: ["Catalog admin is closed."] };
  }

  const now = new Date();
  const subject = trackingSubject(`sign-in:${await currentClientAddress()}`);
  const sql = await applicationSql();

  if (!(await attemptAllowed(sql, subject, now, signInAttemptLimit))) {
    return { errors: ["Too many sign-in attempts. Wait and try again."] };
  }

  try {
    await kit.signIn("credentials", {
      email: text(formData, "email"),
      password: typeof formData.get("password") === "string" ? String(formData.get("password")) : "",
      redirectTo: "/admin/products",
    });
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }

    await recordAttempt(sql, subject, now);

    if (error instanceof CredentialsSignin && error.code === "rate_limited") {
      return { errors: ["Too many sign-in attempts. Wait and try again."] };
    }

    return { errors: ["That email or password does not match an owner account."] };
  }

  return { errors: [] };
}

export async function logoutAction(): Promise<void> {
  await connection();
  const kit = authKit();

  if (!kit) {
    redirect("/admin/login");
  }

  await kit.signOut({ redirectTo: "/admin/login" });
}

export async function saveProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  const assetIds = await assignableAssetIds();
  const parsed = productInputFromForm(formData, {
    categoryIds: (await listCategories()).map((category) => category.id),
    assetIds,
  });

  if (!parsed.ok) {
    return { errors: parsed.errors };
  }

  let savedId = "";

  try {
    savedId = (await saveCatalogProduct(parsed.value, assetIds)).id;
  } catch (error) {
    if (error instanceof CatalogStoreError) {
      return { errors: error.errors };
    }

    throw error;
  }

  redirect(`/admin/products/${savedId}`);
}

export async function deleteProductAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  const id = formData.get("id");

  try {
    await deleteCatalogProduct(typeof id === "string" ? id : "");
  } catch (error) {
    if (error instanceof CatalogStoreError) {
      return { errors: error.errors };
    }

    throw error;
  }

  redirect("/admin/products");
}

export async function createCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  const name = text(formData, "name");
  const requestedSlug = text(formData, "slug");

  try {
    await createCategory({
      name,
      slug: requestedSlug || slugFromName(name),
      description: text(formData, "description"),
    });
  } catch (error) {
    if (error instanceof CatalogStoreError) {
      return { errors: error.errors };
    }

    throw error;
  }

  redirect("/admin/products");
}

export async function uploadMediaAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { errors: ["Choose an image file."] };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const inspected = inspectImage(bytes, file.type);

  if ("error" in inspected) {
    return { errors: [inspected.error] };
  }

  const record = await insertMediaRecord(await applicationSql(), { contentType: inspected.contentType, byteSize: bytes.byteLength }, new Date());

  try {
    await putMediaBytes(record.id, bytes, inspected.contentType);
  } catch (error) {
    logError("media", error);
    await deleteMediaBytes(record.id);
    await applicationSql().then((sql) => sql.execute("DELETE FROM media_objects WHERE id = ?", [record.id]));
    return { errors: ["The image was not stored."] };
  }

  const returnTo = text(formData, "returnTo");
  redirect(returnTo.startsWith("/admin/products") ? returnTo : "/admin/products");
}

export async function setMediaApprovalAction(_state: FormState, formData: FormData): Promise<FormState> {
  const denied = await adminDenialMessage();

  if (denied) {
    return { errors: [denied] };
  }

  const approval = text(formData, "approval");

  if (!isMediaApproval(approval)) {
    return { errors: ["Choose withheld or approved for the site."] };
  }

  try {
    await setMediaApproval(await applicationSql(), text(formData, "id"), approval);
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : "The image approval was not saved."] };
  }

  const returnTo = text(formData, "returnTo");
  redirect(returnTo.startsWith("/admin/products") ? returnTo : "/admin/products");
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

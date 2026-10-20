"use client";

import { useActionState } from "react";
import { setMediaApprovalAction, uploadMediaAction, type FormState } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";

const initialState: FormState = { errors: [] };
const fieldClass = "mt-2 w-full border border-ivory/20 bg-transparent px-3 py-3 text-sm text-ivory";

export function MediaTools({ returnTo, uploads }: { returnTo: string; uploads: { id: string; shortLabel: string; approval: string }[] }) {
  const [uploadState, upload, uploadPending] = useActionState(uploadMediaAction, initialState);
  const [approvalState, approve, approvalPending] = useActionState(setMediaApprovalAction, initialState);

  return (
    <div className="mb-10 space-y-8">
      <form action={upload} className="max-w-xl space-y-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <p className="font-editorial text-3xl text-ivory">Upload a photograph</p>
        <p className="text-sm leading-relaxed text-silver">
          JPEG, PNG, or WebP, up to 8 MB. A new file stays withheld. It is not published, and the private-preview photographs are not copied here.
        </p>
        {uploadState.errors[0] ? (
          <p role="alert" className="border border-burgundy px-4 py-3 text-sm text-ivory">
            {uploadState.errors[0]}
          </p>
        ) : null}
        <label className="block text-sm text-ivory">
          Image file
          <input className={fieldClass} type="file" name="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <Button type="submit" variant="secondary" disabled={uploadPending}>
          {uploadPending ? "Uploading" : "Upload image"}
        </Button>
      </form>
      {uploads.length > 0 ? (
        <form action={approve} className="max-w-xl space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          {approvalState.errors[0] ? (
            <p role="alert" className="border border-burgundy px-4 py-3 text-sm text-ivory">
              {approvalState.errors[0]}
            </p>
          ) : null}
          <label className="block text-sm text-ivory">
            Uploaded image
            <select className={fieldClass} name="id" defaultValue={uploads[0]?.id}>
              {uploads.map((uploadItem) => (
                <option key={uploadItem.id} value={uploadItem.id}>
                  {uploadItem.shortLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-ivory">
            Approval
            <select className={fieldClass} name="approval" defaultValue="withheld">
              <option value="withheld">Withheld</option>
              <option value="approved-for-demo">Approved for the site</option>
            </select>
          </label>
          <Button type="submit" variant="secondary" disabled={approvalPending}>
            {approvalPending ? "Saving" : "Save image approval"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

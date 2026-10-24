// A checkbox sends "on" when ticked and nothing when not.
export function parseDirectoryForm(formData: FormData): boolean {
  return formData.get("show_in_directory") === "on";
}

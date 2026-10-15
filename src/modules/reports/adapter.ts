/** No network-capable adapter is enabled in this local prototype. */
export type SummaryAdapterName = "local-template-v1";
export interface SummaryAdapter {
  name: SummaryAdapterName;
  externalDataTransfer: false;
  validateConfiguration(): void;
}
export const localTemplateAdapter: SummaryAdapter = {
  name: "local-template-v1",
  externalDataTransfer: false,
  validateConfiguration() {
    const configured = process.env.CARE_SUMMARY_ADAPTER ?? "local-template-v1";
    if (configured !== this.name)
      throw new Error(
        "The configured summary adapter is unavailable. Your original care records are unchanged.",
      );
  },
};
export function getSummaryAdapter(): SummaryAdapter {
  localTemplateAdapter.validateConfiguration();
  return localTemplateAdapter;
}

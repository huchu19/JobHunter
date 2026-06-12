/**
 * Pure helpers for generating useful search links for a company.
 *
 * We use search-based URLs rather than direct company websites because the
 * gov.uk sponsor register lists official/registered names, which often differ
 * from a company's trading or brand name. Search engines handle that fuzzy
 * match for us.
 */

export function linkedInJobsUrl(company: string): string {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
    company
  )}`;
}

export function googleCareersUrl(company: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${company} careers`
  )}`;
}

export function glassdoorSearchUrl(company: string): string {
  return `https://www.glassdoor.co.uk/Search/results.htm?keyword=${encodeURIComponent(
    company
  )}`;
}

export function googleSalaryUrl(company: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(
    `${company} salary benefits london`
  )}`;
}

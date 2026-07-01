-- Drop old flat free-text columns (superseded by structured JSON entries)
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "education";
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "workHistory";

-- Add structured JSON entry columns
ALTER TABLE "Profile" ADD COLUMN "educationEntries"  TEXT;
ALTER TABLE "Profile" ADD COLUMN "experienceEntries" TEXT;
ALTER TABLE "Profile" ADD COLUMN "certifications"    TEXT;
ALTER TABLE "Profile" ADD COLUMN "languages"         TEXT;
ALTER TABLE "Profile" ADD COLUMN "projects"          TEXT;

-- Add misc quick-fill columns
ALTER TABLE "Profile" ADD COLUMN "highestQualification" TEXT;
ALTER TABLE "Profile" ADD COLUMN "willingToRelocate"    TEXT;
ALTER TABLE "Profile" ADD COLUMN "drivingLicence"       TEXT;
ALTER TABLE "Profile" ADD COLUMN "securityClearance"    TEXT;

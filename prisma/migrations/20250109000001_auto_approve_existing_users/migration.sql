-- Auto-approve all existing users
-- This is a data migration for existing users who were created before the approval workflow
-- New users will be created with isApproved = false (the default)

UPDATE "User" SET "isApproved" = true WHERE "isApproved" = false;

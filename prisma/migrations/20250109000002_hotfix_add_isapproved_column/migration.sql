-- Hotfix: Add isApproved column if it doesn't exist
-- This handles the case where production was baselined but missing the column

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name = 'isApproved'
    ) THEN
        ALTER TABLE "User" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;
        -- Auto-approve all existing users
        UPDATE "User" SET "isApproved" = true;
        RAISE NOTICE 'Added isApproved column and approved existing users';
    ELSE
        RAISE NOTICE 'isApproved column already exists';
    END IF;
END $$;

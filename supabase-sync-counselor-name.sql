-- Migration: Sync counselor names across users and counselors tables
-- Run this SQL in your Supabase SQL Editor

-- 1. Create a function to handle when a user updates their profile name
CREATE OR REPLACE FUNCTION handle_user_name_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent infinite trigger recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.name IS DISTINCT FROM NEW.name THEN
    -- Update counselor table if this user is also a counselor
    UPDATE counselors 
    SET name = NEW.name, updated_at = NOW()
    WHERE email = NEW.email OR (NEW.id IS NOT NULL AND user_id = NEW.id);

    -- Update the assigned counselor name for all mentees in the users table
    -- (This handles the case where other users have chosen this user as their counselor)
    UPDATE users
    SET 
      counselor = NEW.name,
      hierarchy = jsonb_set(coalesce(hierarchy, '{}'::jsonb), '{counselor}', to_jsonb(NEW.name::text))
    WHERE counselor_id IN (
        SELECT id::text FROM counselors WHERE email = NEW.email OR user_id = NEW.id
        UNION
        SELECT user_id::text FROM counselors WHERE (email = NEW.email OR user_id = NEW.id) AND user_id IS NOT NULL
        UNION
        SELECT NEW.id::text
      )
       OR (OLD.name IS NOT NULL AND OLD.name <> '' AND counselor = OLD.name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger on the users table
DROP TRIGGER IF EXISTS on_user_name_update ON users;

CREATE TRIGGER on_user_name_update
  AFTER UPDATE OF name ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_name_update();

-- 3. Create a function to handle when a counselor's name is updated directly
CREATE OR REPLACE FUNCTION handle_counselor_name_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent infinite trigger recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.name IS DISTINCT FROM NEW.name THEN
    -- Update the counselor's own user account name
    UPDATE users 
    SET name = NEW.name, updated_at = NOW()
    WHERE email = NEW.email OR (NEW.user_id IS NOT NULL AND id = NEW.user_id);

    -- Update the assigned counselor name for all their mentees in the users table
    UPDATE users
    SET 
      counselor = NEW.name,
      hierarchy = jsonb_set(coalesce(hierarchy, '{}'::jsonb), '{counselor}', to_jsonb(NEW.name::text))
    WHERE counselor_id = NEW.id::text
       OR (NEW.user_id IS NOT NULL AND counselor_id = NEW.user_id::text)
       OR (OLD.name IS NOT NULL AND OLD.name <> '' AND counselor = OLD.name);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger on the counselors table
DROP TRIGGER IF EXISTS on_counselor_name_update ON counselors;

CREATE TRIGGER on_counselor_name_update
  AFTER UPDATE OF name ON counselors
  FOR EACH ROW
  EXECUTE FUNCTION handle_counselor_name_update();

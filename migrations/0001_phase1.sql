CREATE TYPE request_status AS ENUM ('NEW','CONTACTED','IN_PROGRESS','QUOTED','CLOSED_WON','CLOSED_LOST','CANCELLED');
--> statement-breakpoint
CREATE TYPE request_type AS ENUM ('NEED_BASED','EXACT_MODEL','CUSTOM_BUILD');
--> statement-breakpoint
CREATE TYPE request_source AS ENUM ('WEBSITE_FORM','WEBSITE_BUILDER','WHATSAPP_DIRECT');
--> statement-breakpoint
CREATE SEQUENCE request_ref_seq MAXVALUE 999999 NO CYCLE;
--> statement-breakpoint
CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, name text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'ADMIN' CHECK(role='ADMIN'), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, whatsapp text NOT NULL, email text, city text NOT NULL, preferred_contact_method text NOT NULL CHECK(preferred_contact_method IN ('WHATSAPP','EMAIL','PHONE')), consent_given boolean NOT NULL CHECK(consent_given), created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE TABLE requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), public_ref text NOT NULL UNIQUE DEFAULT ('TR-' || lpad(nextval('request_ref_seq')::text,6,'0')), tracking_token text NOT NULL UNIQUE, submission_key uuid NOT NULL UNIQUE, source request_source NOT NULL, customer_id uuid NOT NULL REFERENCES customers(id), request_type request_type NOT NULL, original_message text NOT NULL CHECK(length(original_message) BETWEEN 10 AND 5000), budget_min integer CHECK(budget_min>=0), budget_max integer CHECK(budget_max>=0), condition text NOT NULL CHECK(condition IN ('NEW','USED','EITHER')), status request_status NOT NULL DEFAULT 'NEW', assigned_to uuid REFERENCES users(id), version integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(budget_min IS NULL OR budget_max IS NULL OR budget_min<=budget_max));
--> statement-breakpoint
CREATE INDEX requests_status_idx ON requests(status);
--> statement-breakpoint
CREATE INDEX requests_source_idx ON requests(source);
--> statement-breakpoint
CREATE INDEX requests_created_idx ON requests(created_at);
--> statement-breakpoint
CREATE TABLE request_requirements (request_id uuid PRIMARY KEY REFERENCES requests(id), cpu text, gpu text, ram text, ram_type text, storage text, display text, screen_size text, resolution text, portability text, gaming text, other text);
--> statement-breakpoint
CREATE TABLE status_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests(id), from_status request_status, to_status request_status NOT NULL, changed_by uuid REFERENCES users(id), reason text, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE INDEX history_request_idx ON status_history(request_id);
--> statement-breakpoint
CREATE TABLE admin_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests(id), author uuid NOT NULL REFERENCES users(id), note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
--> statement-breakpoint
CREATE INDEX notes_request_idx ON admin_notes(request_id);
--> statement-breakpoint
CREATE TABLE rate_limits (key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);
--> statement-breakpoint
CREATE INDEX rate_limits_expiry_idx ON rate_limits(expires_at);
--> statement-breakpoint
CREATE FUNCTION prevent_original_message_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.original_message IS DISTINCT FROM OLD.original_message THEN RAISE EXCEPTION 'Original request text is immutable'; END IF; RETURN NEW; END; $$;
--> statement-breakpoint
CREATE TRIGGER original_message_immutable BEFORE UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION prevent_original_message_change();
--> statement-breakpoint

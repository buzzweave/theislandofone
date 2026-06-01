UPDATE auth.users
SET encrypted_password = crypt('Blairbo361!', gen_salt('bf')),
    updated_at = now()
WHERE email = 'support@buzzweave.com';
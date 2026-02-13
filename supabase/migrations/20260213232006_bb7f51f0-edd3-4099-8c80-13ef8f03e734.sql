
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;

-- Create permissive policies for the anon client
CREATE POLICY "Allow read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow update notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Allow delete notifications" ON notifications FOR DELETE USING (true);

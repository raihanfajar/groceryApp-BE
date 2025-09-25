-- Fix store admin assignments
-- This migration ensures all non-super admin users have a storeId assigned

-- Step 1: Create a temporary function to assign store admins to stores
DO $$
DECLARE
    unassigned_admin RECORD;
    available_store RECORD;
    store_cursor CURSOR FOR 
        SELECT id, name, city FROM "Store" WHERE "deletedAt" IS NULL ORDER BY "createdAt" ASC;
    store_index INTEGER := 0;
    total_stores INTEGER;
BEGIN
    -- Get total number of stores
    SELECT COUNT(*) INTO total_stores FROM "Store" WHERE "deletedAt" IS NULL;
    
    -- If no stores exist, log and exit
    IF total_stores = 0 THEN
        RAISE NOTICE 'No stores found - cannot assign store admins';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found % stores available for assignment', total_stores;
    
    -- Loop through each unassigned store admin
    FOR unassigned_admin IN 
        SELECT id, name, email FROM "Admin" 
        WHERE "isSuper" = false AND "storeId" IS NULL AND "deletedAt" IS NULL
    LOOP
        RAISE NOTICE 'Processing unassigned admin: % (%)', unassigned_admin.name, unassigned_admin.email;
        
        -- Strategy 1: Try to match by email pattern (e.g., jakarta@... -> Jakarta store)
        SELECT id, name, city INTO available_store
        FROM "Store" 
        WHERE "deletedAt" IS NULL 
        AND (
            LOWER(unassigned_admin.email) LIKE '%' || LOWER(city) || '%' OR
            LOWER(unassigned_admin.email) LIKE '%' || LOWER(SPLIT_PART(name, ' ', 1)) || '%'
        )
        ORDER BY "createdAt" ASC
        LIMIT 1;
        
        -- If no pattern match found, assign to next available store round-robin style
        IF available_store.id IS NULL THEN
            OPEN store_cursor;
            
            -- Move cursor to current position
            FOR i IN 1..(store_index % total_stores + 1) LOOP
                FETCH store_cursor INTO available_store;
            END LOOP;
            
            CLOSE store_cursor;
            store_index := store_index + 1;
            
            RAISE NOTICE 'No pattern match - assigning % to % (round-robin)', unassigned_admin.name, available_store.name;
        ELSE
            RAISE NOTICE 'Pattern match found - assigning % to % based on email pattern', unassigned_admin.name, available_store.name;
        END IF;
        
        -- Update the admin with the assigned store
        UPDATE "Admin" 
        SET "storeId" = available_store.id, "updatedAt" = NOW()
        WHERE id = unassigned_admin.id;
        
        RAISE NOTICE 'Successfully assigned % to store % (%)', unassigned_admin.name, available_store.name, available_store.city;
        
        -- Reset available_store for next iteration
        available_store := NULL;
    END LOOP;
    
    -- Final verification
    DECLARE
        remaining_unassigned INTEGER;
    BEGIN
        SELECT COUNT(*) INTO remaining_unassigned 
        FROM "Admin" 
        WHERE "isSuper" = false AND "storeId" IS NULL AND "deletedAt" IS NULL;
        
        IF remaining_unassigned = 0 THEN
            RAISE NOTICE 'SUCCESS: All store admins now have store assignments!';
        ELSE
            RAISE NOTICE 'WARNING: % store admin(s) still unassigned', remaining_unassigned;
        END IF;
    END;
END $$;
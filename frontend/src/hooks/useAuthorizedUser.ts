import { useUser } from "@clerk/clerk-react";
import { useMemo } from "react";

/**
 * Hook to check if the current user is authorized to access the dashboard.
 * Authorization is based on the VITE_AUTHORIZED_EMAILS environment variable,
 * which should be a comma-separated list of email addresses.
 * 
 * If VITE_AUTHORIZED_EMAILS is not set or empty, all authenticated users are authorized.
 * 
 * @returns {{ isAuthorized: boolean, isLoading: boolean }}
 */
export function useAuthorizedUser() {
    const { user, isLoaded } = useUser();

    const { isAuthorized, authorizedEmails } = useMemo(() => {
        // Get the authorized emails from environment variable
        const authorizedEmailsEnv = import.meta.env.VITE_AUTHORIZED_EMAILS || "";

        // Parse comma-separated emails, trim whitespace, convert to lowercase
        const emailList = authorizedEmailsEnv
            .split(",")
            .map((email: string) => email.trim().toLowerCase())
            .filter((email: string) => email.length > 0);

        // If no authorized emails are configured, allow all authenticated users
        if (emailList.length === 0) {
            return { isAuthorized: true, authorizedEmails: [] };
        }

        // Check if the current user's email is in the authorized list
        if (!user) {
            return { isAuthorized: false, authorizedEmails: emailList };
        }

        const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
        const authorized = emailList.includes(userEmail);

        return { isAuthorized: authorized, authorizedEmails: emailList };
    }, [user]);

    return {
        isAuthorized,
        isLoading: !isLoaded,
        authorizedEmails,
    };
}

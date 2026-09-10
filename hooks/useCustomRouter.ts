
import { useRouter } from 'expo-router';

export const useCustomRouter = () => {
    const router = useRouter();

    const navigateToPayment = (programId: string | number) => {
        router.push({
            pathname: '/(app)/learn/[pdId]/payment',
            params: { pdId: programId }
        });
    };

    const navigateToShop = (programId: string | number) => {
        // Redirecting shop to payment page of the program
        navigateToPayment(programId);
    }

    // Secondary (collège) programs have their own payment route/table -- see
    // app/(app)/secondary/program/[programId]/payment.tsx. navigateToShop/
    // navigateToPayment above are concours-only (hardcoded to
    // /(app)/learn/[pdId]/payment), so secondary call sites must use this
    // instead.
    const navigateToSecondaryPayment = (programId: string | number) => {
        router.push({
            // @ts-expect-error - new route, typed-routes codegen regenerates on next `expo start`
            pathname: '/(app)/secondary/program/[programId]/payment',
            params: { programId }
        });
    };

    return {
        ...router,
        navigateToPayment,
        navigateToShop,
        navigateToSecondaryPayment
    };
};

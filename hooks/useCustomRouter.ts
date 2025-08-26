
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

    return {
        ...router,
        navigateToPayment,
        navigateToShop
    };
};

import run from '@/config/gemini';
import {QuizQuestion, QuizOption} from '@/types/quiz.type';

export class CorrectionService {
    /**
     * Génère la réponse « officielle » d'une question de quiz via l'API Gemini
     * seulement si le champ justificatif est vide.
     *
     * @param question l'objet QuizQuestion contenant le contenu et les options
     * @returns le texte de la réponse générée ou le justificatif existant
     */
    static async generateAnswer(
        question: QuizQuestion
    ): Promise<string> {
        // Si un justificatif existe déjà, on le retourne directement
        if (question.justificatif && question.justificatif.trim() !== '') {
            return question.justificatif;
        }
        
        // Sinon, on génère une réponse avec Gemini
        const prompt = `
Question de quiz (ID: ${question.id}) :
${typeof question.title === 'string' ? question.title : JSON.stringify(question.title)}

Options :
${question.options
            .map((opt: QuizOption, idx: number) => `${idx + 1}. ${opt.value}`)
            .join('\n')}

Type de question : ${question.isMultiple ? 'Choix multiple' : 'Choix unique'}.

Merci de fournir Une brève explication de la réponse. N'utilise pas de ** pour mettre en gras
`.trim();

        try {
            const responseText = await run(prompt);
            return responseText;
        } catch (error) {
            console.error('Erreur dans CorrectionService.generateAnswer :', error);
            throw error;
        }
    }
}
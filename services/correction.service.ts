import run from '@/config/gemini';
import {QuizQuestion, QuizOption} from '@/types/quiz.type';

export class CorrectionService {
    /**
     * Génère la réponse « officielle » d’une question de quiz via l’API Gemini.
     *
     * @param question l’objet QuizQuestion contenant le contenu et les options
     * @returns le texte de la réponse générée (numéros d’option + libellés + explication)
     */
    static async generateAnswer(
        question: QuizQuestion
    ): Promise<string> {
        // Construire un prompt adapté à la structure de QuizQuestion
        const prompt = `
Question de quiz (ID: ${question.id}) :
${typeof question.title === 'string' ? question.title : JSON.stringify(question.title)}

Options :
${question.options
            .map((opt: QuizOption, idx: number) => `${idx + 1}. ${opt.value}`)
            .join('\n')}

Type de question : ${question.isMultiple ? 'Choix multiple' : 'Choix unique'}.

Merci de fournir :
1) Le(s) numéro(s) de l’option correcte (correspondant à la numérotation ci-dessus)
2) Le(s) libellé(s) exact(s) de l’option
3) Une brève explication de la réponse.
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
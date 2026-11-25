import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'backend'))
from app.services.mathai.arithmetic import check_arithmetic, protect_evaluation

class ArithmeticReviewTests(unittest.TestCase):
    def test_short_correct_work(self):
        self.assertEqual(check_arithmetic(r'$\frac{5\cdot7}{2}=17,5$')['status'], 'consistent')
    def test_confused_digit(self):
        self.assertEqual(check_arithmetic(r'$\frac{8\cdot7}{2}=17,5$')['status'], 'conflict')
    def test_chain_and_assignment(self):
        self.assertEqual(check_arithmetic('S = 8*7/2 = 17.5')['status'], 'conflict')
        self.assertEqual(check_arithmetic('5*7=35=17.5')['status'], 'conflict')
    def test_unsupported_is_not_proof(self):
        for text in ['17.5', 'x*x=4', '__import__("os").system("id")=0', '9**999999=0', '1/0=2']:
            self.assertEqual(check_arithmetic(text)['status'], 'unsupported')
    def test_only_original_transcription_is_checked(self):
        result = protect_evaluation({'veredito':'incorreto', 'transcricao_latex':'8*7/2=17.5', 'diagnostico':'erro', 'desenvolvimento_presente':True}, has_image=True)
        self.assertTrue(result['precisa_revisao_humana'])
        self.assertTrue(result['ocr_review_required'])
        self.assertEqual(result['transcricao_latex'], '8*7/2=17.5')
    def test_confirming_wrong_work_does_not_approve_it(self):
        result = protect_evaluation({'veredito':'aprovado', 'resultado_final_correto':True, 'transcricao_latex':'8*7/2=17.5'}, has_image=False, confirmed_text='8*7/2=17.5')
        self.assertEqual(result['veredito'], 'parcial')
        self.assertFalse(result['resultado_final_correto'])
        self.assertFalse(result.get('ocr_review_required', False))
    def test_correct_arithmetic_does_not_override_conceptual_verdict(self):
        result = protect_evaluation({'veredito':'incorreto', 'transcricao_latex':'5*7/2=17.5'}, has_image=True)
        self.assertEqual(result['veredito'], 'incorreto')
        self.assertFalse(result.get('ocr_review_required', False))
    def test_sympy_radicals_and_trig_trigger_ocr_recheck_on_conflict(self):
        self.assertEqual(check_arithmetic(r'$\sqrt{8} = 2\sqrt{2}$')['status'], 'consistent')
        self.assertEqual(check_arithmetic(r'$\sqrt{8} = 4\sqrt{2}$')['status'], 'conflict')
        self.assertEqual(check_arithmetic(r'$\sin(\pi/6) = 1/2$')['status'], 'consistent')
        self.assertEqual(check_arithmetic(r'$\sin(\pi/6) = 1$')['status'], 'conflict')
        result = protect_evaluation(
            {'veredito': 'aprovado', 'transcricao_latex': r'$\sqrt{8} = 4\sqrt{2}$', 'diagnostico': 'ok'},
            has_image=True,
        )
        self.assertTrue(result['precisa_revisao_humana'])
        self.assertTrue(result['ocr_review_required'])
    def test_sympy_algebraic_identity_vs_contingent_equation(self):
        self.assertEqual(check_arithmetic('$(x+1)^2 = x^2 + 2x + 1$')['status'], 'consistent')
        self.assertEqual(check_arithmetic('$(x+1)^2 - x^2 - 2x = 5$')['status'], 'conflict')
        self.assertEqual(check_arithmetic('$2x = 6$')['status'], 'unsupported')


    def test_step_equivalence_univariate_and_sign_error(self):
        ok = check_arithmetic(r'$2x + 4 = 10 \implies 2x = 6 \implies x = 3$')
        self.assertEqual(ok['status'], 'consistent')
        self.assertTrue(any(c.get('engine') == 'sympy-step' and c['equal'] for c in ok['checks']))

        bad = check_arithmetic(r'$2x + 4 = 10 \implies 2x = 14 \implies x = 7$')
        self.assertEqual(bad['status'], 'conflict')
        self.assertTrue(any(c.get('engine') == 'sympy-step' and not c['equal'] for c in bad['checks']))

    def test_step_equivalence_quadratic_and_multivariate_schwartz_zippel(self):
        self.assertEqual(check_arithmetic(r'$x^2 - 5x + 6 = 0 \implies (x-2)(x-3) = 0$')['status'], 'consistent')
        self.assertEqual(check_arithmetic(r'$x^2 - 5x + 6 = 0 \implies (x-2)(x+3) = 0$')['status'], 'conflict')
        self.assertEqual(check_arithmetic('x + y = 5 => 2*x + 2*y = 10')['status'], 'consistent')
        self.assertEqual(check_arithmetic('x + y = 5 => x = 5 + y')['status'], 'conflict')

    def test_step_equivalence_avoids_false_positives_on_disjunction_and_domain_restriction(self):
        self.assertEqual(check_arithmetic('As raízes são $x = 2$ ou $x = 5$')['status'], 'unsupported')
        self.assertEqual(check_arithmetic(r'$x^2 = 4 \implies x = 2$')['status'], 'unsupported')

    def test_protect_evaluation_blocks_sycophancy_on_step_conflict(self):
        result = protect_evaluation(
            {'veredito': 'aprovado', 'resultado_final_correto': True, 'transcricao_latex': '2x + 4 = 10 => 2x = 14'},
            has_image=False,
            confirmed_text='2x + 4 = 10 => 2x = 14',
        )
        self.assertEqual(result['veredito'], 'parcial')
        self.assertFalse(result['resultado_final_correto'])

if __name__ == '__main__': unittest.main()

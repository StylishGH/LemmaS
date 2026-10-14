"""
Módulo canônico de tradução e normalização da taxonomia do MathNet
para as categorias oficiais do LEMMAS.
Mapeia qualquer um dos 180 tópicos do MathNet para (materia, topico, subtopico).
"""

from typing import Tuple, Dict, Optional
import re

# Dicionário exato para as 180 categorias do MathNet
TAXONOMIA_EXATA: Dict[str, Tuple[str, str, str]] = {
    # ÁLGEBRA ABSTRATA
    "Algebra > Abstract Algebra > Field Theory": ("Álgebra", "Estruturas Algébricas", "Teoria dos Corpos"),
    "Algebra > Abstract Algebra > Group Theory": ("Álgebra", "Estruturas Algébricas", "Teoria dos Grupos"),
    "Algebra > Abstract Algebra > Other": ("Álgebra", "Estruturas Algébricas", "Álgebra Abstrata Geral"),
    "Algebra > Abstract Algebra > Permutations / basic group theory": ("Álgebra", "Estruturas Algébricas", "Permutações e Grupos Básicos"),
    "Algebra > Abstract Algebra > Ring Theory": ("Álgebra", "Estruturas Algébricas", "Teoria dos Anéis"),

    # EQUAÇÕES FUNCIONAIS
    "Algebra > Algebraic Expressions > Functional Equations": ("Álgebra", "Equações Funcionais", "Equações Funcionais"),
    "Algebra > Algebraic Expressions > Functional Equations > Existential quantifiers": ("Álgebra", "Equações Funcionais", "Quantificadores Existenciais"),
    "Algebra > Algebraic Expressions > Functional Equations > Injectivity / surjectivity": ("Álgebra", "Equações Funcionais", "Injetividade e Sobrejetividade"),

    # POLINÔMIOS E COMPLEXOS
    "Algebra > Algebraic Expressions > Polynomials": ("Polinômios e Complexos", "Polinômios", "Polinômios Gerais"),
    "Algebra > Algebraic Expressions > Polynomials > Chebyshev polynomials": ("Polinômios e Complexos", "Polinômios", "Polinômios de Chebyshev"),
    "Algebra > Algebraic Expressions > Polynomials > Descartes' Rule of Signs": ("Polinômios e Complexos", "Polinômios", "Regra dos Sinais de Descartes"),
    "Algebra > Algebraic Expressions > Polynomials > Intermediate Value Theorem": ("Polinômios e Complexos", "Polinômios", "Teorema do Valor Intermediário e Bolzano"),
    "Algebra > Algebraic Expressions > Polynomials > Irreducibility: Rational Root Theorem, Gauss's Lemma, Eisenstein": ("Polinômios e Complexos", "Polinômios", "Critérios de Irredutibilidade (Eisenstein e Gauss)"),
    "Algebra > Algebraic Expressions > Polynomials > Irreducibility: Rational Root Theorem, Gauss’s Lemma": ("Polinômios e Complexos", "Polinômios", "Teorema das Raízes Racionais e Lema de Gauss"),
    "Algebra > Algebraic Expressions > Polynomials > Polynomial interpolation: Newton, Lagrange": ("Polinômios e Complexos", "Polinômios", "Interpolação Polinomial (Newton e Lagrange)"),
    "Algebra > Algebraic Expressions > Polynomials > Polynomial operations": ("Polinômios e Complexos", "Polinômios", "Operações e Divisão de Polinômios"),
    "Algebra > Algebraic Expressions > Polynomials > Roots of unity": ("Polinômios e Complexos", "Números Complexos", "Raízes da Unidade e Forma Trigonométrica"),
    "Algebra > Algebraic Expressions > Polynomials > Symmetric functions": ("Polinômios e Complexos", "Polinômios", "Polinômios Simétricos"),
    "Algebra > Algebraic Expressions > Polynomials > Vieta's formulas": ("Polinômios e Complexos", "Polinômios", "Relações de Girard (Fórmulas de Viète)"),
    "Algebra > Intermediate Algebra > Complex numbers": ("Polinômios e Complexos", "Números Complexos", "Operações no Plano Complexo"),

    # SEQUÊNCIAS E SÉRIES
    "Algebra > Algebraic Expressions > Sequences and Series": ("Álgebra", "Sequências e Séries", "Progressões e Séries"),
    "Algebra > Algebraic Expressions > Sequences and Series > Abel summation": ("Álgebra", "Sequências e Séries", "Somação por Partes de Abel"),
    "Algebra > Algebraic Expressions > Sequences and Series > Floors and ceilings": ("Álgebra", "Funções Especiais", "Funções Maior Inteiro (Piso e Teto)"),
    "Algebra > Algebraic Expressions > Sequences and Series > Recurrence relations": ("Álgebra", "Sequências e Séries", "Relações de Recorrência"),
    "Algebra > Algebraic Expressions > Sequences and Series > Sums and products": ("Álgebra", "Sequências e Séries", "Somatórios e Produtórios"),
    "Algebra > Algebraic Expressions > Sequences and Series > Telescoping series": ("Álgebra", "Sequências e Séries", "Séries Telescópicas"),

    # DESIGUALDADES E EQUAÇÕES
    "Algebra > Equations and Inequalities": ("Álgebra", "Desigualdades", "Equações e Desigualdades"),
    "Algebra > Equations and Inequalities > Cauchy-Schwarz": ("Álgebra", "Desigualdades", "Desigualdade de Cauchy-Schwarz"),
    "Algebra > Equations and Inequalities > Combinatorial optimization": ("Álgebra", "Otimização", "Otimização Combinatória"),
    "Algebra > Equations and Inequalities > Jensen / smoothing": ("Álgebra", "Desigualdades", "Desigualdade de Jensen e Smoothing"),
    "Algebra > Equations and Inequalities > Linear and quadratic inequalities": ("Álgebra", "Desigualdades", "Desigualdades Lineares e Quadráticas"),
    "Algebra > Equations and Inequalities > Muirhead / majorization": ("Álgebra", "Desigualdades", "Desigualdade de Muirhead e Majorização"),
    "Algebra > Equations and Inequalities > QM-AM-GM / Power Mean": ("Álgebra", "Desigualdades", "Desigualdade das Médias (MQ-MA-MG)"),
    "Algebra > Equations and Inequalities > QM-AM-GM-HM / Power Mean": ("Álgebra", "Desigualdades", "Desigualdade das Médias (MQ-MA-MG-MH)"),

    # ÁLGEBRA INTERMEDIÁRIA
    "Algebra > Intermediate Algebra > Exponential functions": ("Álgebra", "Funções Exponenciais e Logarítmicas", "Funções Exponenciais"),
    "Algebra > Intermediate Algebra > Logarithmic functions": ("Álgebra", "Funções Exponenciais e Logarítmicas", "Logaritmos e Funções Logarítmicas"),
    "Algebra > Intermediate Algebra > Other": ("Álgebra", "Funções Elementares", "Propriedades de Funções"),
    "Algebra > Intermediate Algebra > Quadratic functions": ("Álgebra", "Funções Elementares", "Funções Quadráticas"),

    # ÁLGEBRA LINEAR
    "Algebra > Linear Algebra > Determinants": ("Álgebra Linear", "Determinantes", "Cálculo de Determinantes"),
    "Algebra > Linear Algebra > Linear transformations": ("Álgebra Linear", "Transformações Lineares", "Núcleo e Imagem"),
    "Algebra > Linear Algebra > Matrices": ("Álgebra Linear", "Matrizes", "Operações Matriciais e Inversão"),
    "Algebra > Linear Algebra > Vectors": ("Álgebra Linear", "Vetores", "Espaços Vetoriais e Produtos"),

    # ÁLGEBRA BÁSICA / PRÉ-ÁLGEBRA
    "Algebra > Prealgebra / Basic Algebra > Decimals": ("Álgebra", "Aritmética Básica", "Números Decimais"),
    "Algebra > Prealgebra / Basic Algebra > Fractions": ("Álgebra", "Aritmética Básica", "Frações e Proporções"),
    "Algebra > Prealgebra / Basic Algebra > Integers": ("Álgebra", "Aritmética Básica", "Operações com Inteiros"),
    "Algebra > Prealgebra / Basic Algebra > Other": ("Álgebra", "Aritmética Básica", "Álgebra Elementar"),
    "Algebra > Prealgebra / Basic Algebra > Simple Equations": ("Álgebra", "Equações", "Equações de 1º Grau"),

    # CÁLCULO
    "Calculus > Differential Calculus > Applications": ("Cálculo", "Cálculo Diferencial", "Aplicações de Derivadas (Máximos e Mínimos)"),
    "Calculus > Differential Calculus > Derivatives": ("Cálculo", "Cálculo Diferencial", "Regras de Derivação"),
    "Calculus > Differential Calculus > Other": ("Cálculo", "Cálculo Diferencial", "Cálculo Diferencial"),
    "Calculus > Differential Calculus > Related Rates": ("Cálculo", "Cálculo Diferencial", "Taxas Relacionadas"),
    "Calculus > Differential Equations > ODEs": ("Cálculo", "Equações Diferenciais", "Equações Diferenciais Ordinárias (EDOs)"),
    "Calculus > Integral Calculus > Applications": ("Cálculo", "Cálculo Integral", "Aplicações de Integrais (Áreas e Volumes)"),
    "Calculus > Integral Calculus > Techniques > Single-variable": ("Cálculo", "Cálculo Integral", "Técnicas de Integração"),
    "Precalculus > Functions": ("Álgebra", "Funções", "Domínio, Imagem e Composição"),
    "Precalculus > Limits": ("Cálculo", "Limites", "Cálculo de Limites e Continuidade"),
    "Precalculus > Trigonometric functions": ("Trigonometria", "Funções Trigonométricas", "Identidades e Equações Trigonométricas"),

    # COMBINATÓRIA E MATEMÁTICA DISCRETA
    "Discrete Mathematics > Algorithms": ("Probabilidade e Combinatória", "Algoritmos e Jogos", "Algoritmos Discretos"),
    "Discrete Mathematics > Combinatorics": ("Probabilidade e Combinatória", "Análise Combinatória", "Técnicas de Contagem"),
    "Discrete Mathematics > Combinatorics > Algebraic properties of binomial coefficients": ("Probabilidade e Combinatória", "Análise Combinatória", "Propriedades dos Coeficientes Binomiais"),
    "Discrete Mathematics > Combinatorics > Catalan numbers, partitions": ("Probabilidade e Combinatória", "Análise Combinatória", "Números de Catalan e Partições"),
    "Discrete Mathematics > Combinatorics > Coloring schemes, extremal arguments": ("Probabilidade e Combinatória", "Análise Combinatória", "Colorações e Princípio Extremo"),
    "Discrete Mathematics > Combinatorics > Counting two ways": ("Probabilidade e Combinatória", "Análise Combinatória", "Dupla Contagem"),
    "Discrete Mathematics > Combinatorics > Enumeration with symmetry": ("Probabilidade e Combinatória", "Análise Combinatória", "Enumeração com Simetria (Lema de Burnside)"),
    "Discrete Mathematics > Combinatorics > Expected values": ("Probabilidade e Combinatória", "Probabilidade", "Valor Esperado e Método Probabilístico"),
    "Discrete Mathematics > Combinatorics > Functional equations": ("Probabilidade e Combinatória", "Equações Funcionais Discretas", "Equações Funcionais em Conjuntos Finitos"),
    "Discrete Mathematics > Combinatorics > Games / greedy algorithms": ("Probabilidade e Combinatória", "Teoria dos Jogos", "Jogos Imparciais e Algoritmos Gulosos"),
    "Discrete Mathematics > Combinatorics > Generating functions": ("Probabilidade e Combinatória", "Análise Combinatória", "Funções Geradoras"),
    "Discrete Mathematics > Combinatorics > Inclusion-exclusion": ("Probabilidade e Combinatória", "Análise Combinatória", "Princípio da Inclusão-Exclusão"),
    "Discrete Mathematics > Combinatorics > Induction / smoothing": ("Probabilidade e Combinatória", "Métodos de Demonstração", "Indução Matemática e Smoothing"),
    "Discrete Mathematics > Combinatorics > Invariants / monovariants": ("Probabilidade e Combinatória", "Análise Combinatória", "Invariantes e Monovariantes"),
    "Discrete Mathematics > Combinatorics > Pigeonhole principle": ("Probabilidade e Combinatória", "Análise Combinatória", "Princípio da Casa dos Pombos"),
    "Discrete Mathematics > Combinatorics > Recursion, bijection": ("Probabilidade e Combinatória", "Análise Combinatória", "Bijeções e Relações de Recorrência"),
    "Discrete Mathematics > Graph Theory": ("Probabilidade e Combinatória", "Teoria dos Grafos", "Propriedades Básicas de Grafos"),
    "Discrete Mathematics > Graph Theory > Euler characteristic: V-E+F": ("Probabilidade e Combinatória", "Teoria dos Grafos", "Relação de Euler para Grafos Planares"),
    "Discrete Mathematics > Graph Theory > Matchings, Marriage Lemma, Tutte's theorem": ("Probabilidade e Combinatória", "Teoria dos Grafos", "Emparelhamentos e Lema do Casamento de Hall"),
    "Discrete Mathematics > Graph Theory > Menger's theorem / max-flow, min-cut": ("Probabilidade e Combinatória", "Teoria dos Grafos", "Teorema de Menger e Fluxo Máximo"),
    "Discrete Mathematics > Graph Theory > Turán's theorem": ("Probabilidade e Combinatória", "Teoria dos Grafos", "Teorema de Turán e Grafos Extremais"),
    "Discrete Mathematics > Logic": ("Probabilidade e Combinatória", "Lógica Matemática", "Proposições e Paradoxos"),
    "Discrete Mathematics > Other": ("Probabilidade e Combinatória", "Matemática Discreta", "Problemas Diversos"),
    "Statistics > Mathematical Statistics": ("Probabilidade e Combinatória", "Estatística", "Estatística Matemática"),
    "Statistics > Probability > Counting Methods > Combinations": ("Probabilidade e Combinatória", "Probabilidade", "Combinações e Espaços Amostrais"),
    "Statistics > Probability > Counting Methods > Other": ("Probabilidade e Combinatória", "Probabilidade", "Probabilidade Geral"),
    "Statistics > Probability > Counting Methods > Permutations": ("Probabilidade e Combinatória", "Probabilidade", "Permutações e Arranjos"),
    "Math Word Problems": ("Álgebra", "Aritmética e Modelagem", "Problemas Verbais e Modelagem"),

    # GEOMETRIA DIFERENCIAL E NÃO-EUCLIDIANA
    "Geometry > Differential Geometry > Curvature": ("Geometria Diferencial", "Geometria Diferencial", "Curvatura"),
    "Geometry > Differential Geometry > Manifolds": ("Geometria Diferencial", "Geometria Diferencial", "Variedades"),
    "Geometry > Non-Euclidean Geometry > Hyperbolic Geometry": ("Geometria", "Geometrias Não-Euclidianas", "Geometria Hiperbólica"),
    "Geometry > Non-Euclidean Geometry > Spherical Geometry": ("Geometria", "Geometrias Não-Euclidianas", "Geometria Esférica"),

    # GEOMETRIA PLANA - CONFIGURAÇÕES AVANÇADAS
    "Geometry > Plane Geometry > Advanced Configurations > Brocard point, symmedians": ("Geometria Plana", "Pontos Notáveis Avançados", "Pontos de Brocard e Simedianas"),
    "Geometry > Plane Geometry > Advanced Configurations > Isogonal/isotomic conjugates, barycentric coordinates": ("Geometria Plana", "Coordenadas Baricêntricas", "Conjugados Isogonais e Isotômicos"),
    "Geometry > Plane Geometry > Advanced Configurations > Miquel point": ("Geometria Plana", "Pontos Notáveis Avançados", "Ponto e Teorema de Miquel"),
    "Geometry > Plane Geometry > Advanced Configurations > Napoleon and Fermat points": ("Geometria Plana", "Pontos Notáveis Avançados", "Pontos de Fermat e Napoleão"),
    "Geometry > Plane Geometry > Advanced Configurations > Polar triangles, harmonic conjugates": ("Geometria Plana", "Geometria Projetiva", "Polos, Polares e Feixes Harmônicos"),
    "Geometry > Plane Geometry > Advanced Configurations > Simson line": ("Geometria Plana", "Pontos Notáveis Avançados", "Reta de Simson-Wallace"),

    # MÉTODOS ANALÍTICOS EM GEOMETRIA
    "Geometry > Plane Geometry > Analytic / Coordinate Methods > Cartesian coordinates": ("Geometria Analítica", "Plano Cartesiano", "Retas, Distâncias e Cônicas"),
    "Geometry > Plane Geometry > Analytic / Coordinate Methods > Complex numbers in geometry": ("Polinômios e Complexos", "Números Complexos na Geometria", "Geometria com Complexos"),
    "Geometry > Plane Geometry > Analytic / Coordinate Methods > Trigonometry": ("Trigonometria", "Trigonometria Geométrica", "Lei dos Senos e Cossenos"),
    "Geometry > Plane Geometry > Analytic / Coordinate Methods > Vectors": ("Álgebra Linear", "Geometria Vetorial", "Operações Vetoriais e Produto Escalar"),

    # CÍRCULOS
    "Geometry > Plane Geometry > Circles": ("Geometria Plana", "Círculos e Circunferências", "Propriedades Circulares"),
    "Geometry > Plane Geometry > Circles > Circle of Apollonius": ("Geometria Plana", "Círculos e Circunferências", "Círculo de Apolônio"),
    "Geometry > Plane Geometry > Circles > Coaxal circles": ("Geometria Plana", "Círculos e Circunferências", "Famílias de Círculos Coaxiais"),
    "Geometry > Plane Geometry > Circles > Radical axis theorem": ("Geometria Plana", "Círculos e Circunferências", "Eixo Radical e Centro Radical"),
    "Geometry > Plane Geometry > Circles > Tangents": ("Geometria Plana", "Círculos e Circunferências", "Tangentes e Segmentos Tangentes"),

    # GEOMETRIA COMBINATÓRIA
    "Geometry > Plane Geometry > Combinatorial Geometry": ("Geometria Plana", "Geometria Combinatória", "Arranjos de Pontos e Retas"),
    "Geometry > Plane Geometry > Combinatorial Geometry > Convex hulls": ("Geometria Plana", "Geometria Convexa", "Fecho Convexo"),
    "Geometry > Plane Geometry > Combinatorial Geometry > Helly's theorem": ("Geometria Plana", "Geometria Convexa", "Teorema de Helly"),
    "Geometry > Plane Geometry > Combinatorial Geometry > Minkowski's theorem": ("Geometria Plana", "Geometria dos Números", "Teorema de Minkowski"),
    "Geometry > Plane Geometry > Combinatorial Geometry > Pick's theorem": ("Geometria Plana", "Geometria do Reticulado", "Teorema de Pick"),
    "Geometry > Plane Geometry > Combinatorial Geometry > Sylvester's theorem": ("Geometria Plana", "Geometria Combinatória", "Teorema de Sylvester-Gallai"),

    # CONCORRÊNCIA E COLINEARIDADE
    "Geometry > Plane Geometry > Concurrency and Collinearity": ("Geometria Plana", "Concorrência e Colinearidade", "Pontos e Retas Notáveis"),
    "Geometry > Plane Geometry > Concurrency and Collinearity > Ceva's theorem": ("Geometria Plana", "Concorrência e Colinearidade", "Teorema de Ceva"),
    "Geometry > Plane Geometry > Concurrency and Collinearity > Desargues theorem": ("Geometria Plana", "Concorrência e Colinearidade", "Teorema de Desargues"),
    "Geometry > Plane Geometry > Concurrency and Collinearity > Menelaus' theorem": ("Geometria Plana", "Concorrência e Colinearidade", "Teorema de Menelaus"),
    "Geometry > Plane Geometry > Concurrency and Collinearity > Pappus theorem": ("Geometria Plana", "Concorrência e Colinearidade", "Teorema de Pappus"),

    # DESIGUALDADES GEOMÉTRICAS
    "Geometry > Plane Geometry > Geometric Inequalities": ("Geometria Plana", "Desigualdades Geométricas", "Desigualdades em Figuras Planas"),
    "Geometry > Plane Geometry > Geometric Inequalities > Jensen/smoothing": ("Geometria Plana", "Desigualdades Geométricas", "Jensen Aplicado à Geometria"),
    "Geometry > Plane Geometry > Geometric Inequalities > Optimization in geometry": ("Geometria Plana", "Desigualdades Geométricas", "Problemas de Máximos e Mínimos Geométricos"),
    "Geometry > Plane Geometry > Geometric Inequalities > Triangle inequalities": ("Geometria Plana", "Desigualdades Geométricas", "Desigualdade Triangular e Relações Métricas"),

    # DIVERSOS EM GEOMETRIA PLANA
    "Geometry > Plane Geometry > Miscellaneous": ("Geometria Plana", "Geometria Plana Geral", "Problemas Diversos"),
    "Geometry > Plane Geometry > Miscellaneous > Angle chasing": ("Geometria Plana", "Geometria Angular", "Caça aos Ângulos (Angle Chasing)"),
    "Geometry > Plane Geometry > Miscellaneous > Constructions and loci": ("Geometria Plana", "Lugares Geométricos", "Construções e Lugares Geométricos"),
    "Geometry > Plane Geometry > Miscellaneous > Distance chasing": ("Geometria Plana", "Relações Métricas", "Caça às Distâncias e Segmentos"),

    # QUADRILÁTEROS
    "Geometry > Plane Geometry > Quadrilaterals": ("Geometria Plana", "Quadriláteros Notáveis", "Propriedades dos Quadriláteros"),
    "Geometry > Plane Geometry > Quadrilaterals > Cyclic quadrilaterals": ("Geometria Plana", "Quadriláteros Notáveis", "Quadriláteros Cíclicos / Inscritíveis"),
    "Geometry > Plane Geometry > Quadrilaterals > Cyclic quadrilaterials": ("Geometria Plana", "Quadriláteros Notáveis", "Quadriláteros Cíclicos / Inscritíveis"),
    "Geometry > Plane Geometry > Quadrilaterals > Cyclic quadrilaterilaterals": ("Geometria Plana", "Quadriláteros Notáveis", "Quadriláteros Cíclicos / Inscritíveis"),
    "Geometry > Plane Geometry > Quadrilaterals > Cyclic quadrilaterillaterals": ("Geometria Plana", "Quadriláteros Notáveis", "Quadriláteros Cíclicos / Inscritíveis"),
    "Geometry > Plane Geometry > Quadrilaterals > Inscribed/circumscribed quadrilaterals": ("Geometria Plana", "Quadriláteros Notáveis", "Quadriláteros Circunscritíveis (Teorema de Pitot)"),
    "Geometry > Plane Geometry > Quadrilaterals > Inscribed/circumscribed quadrilaterials": ("Geometria Plana", "Quadriláteros Notáveis", "Quadriláteros Circunscritíveis (Teorema de Pitot)"),
    "Geometry > Plane Geometry > Quadrilaterals > Inscribed/circumscribed quadrilaterrals": ("Geometria Plana", "Quadriláteros Notáveis", "Quadriláteros Circunscritíveis (Teorema de Pitot)"),
    "Geometry > Plane Geometry > Quadrilaterals > Quadrilaterals with perpendicular diagonals": ("Geometria Plana", "Quadriláteros Notáveis", "Quadriláteros Ortodiagonais"),

    # TRANSFORMAÇÕES GEOMÉTRICAS
    "Geometry > Plane Geometry > Transformations": ("Geometria Plana", "Transformações Geométricas", "Isometrias e Semelhanças"),
    "Geometry > Plane Geometry > Transformations > Homothety": ("Geometria Plana", "Transformações Geométricas", "Homotetia"),
    "Geometry > Plane Geometry > Transformations > Inversion": ("Geometria Plana", "Transformações Geométricas", "Inversão Geométrica"),
    "Geometry > Plane Geometry > Transformations > Reflection": ("Geometria Plana", "Transformações Geométricas", "Reflexão"),
    "Geometry > Plane Geometry > Transformations > Rotation": ("Geometria Plana", "Transformações Geométricas", "Rotação"),
    "Geometry > Plane Geometry > Transformations > Spiral similarity": ("Geometria Plana", "Transformações Geométricas", "Semelhança Espiral"),
    "Geometry > Plane Geometry > Transformations > Translation": ("Geometria Plana", "Transformações Geométricas", "Translação"),

    # TRIÂNGULOS
    "Geometry > Plane Geometry > Triangles": ("Geometria Plana", "Triângulos", "Propriedades e Congruência"),
    "Geometry > Plane Geometry > Triangles > Triangle centers: centroid, incenter,    circumcenter, Euler line, nine-point circle": ("Geometria Plana", "Triângulos", "Pontos Notáveis, Reta de Euler e Círculo dos 9 Pontos"),
    "Geometry > Plane Geometry > Triangles > Triangle centers: centroid, incenter, circumcenter, Euler line, nine-point circle": ("Geometria Plana", "Triângulos", "Pontos Notáveis, Reta de Euler e Círculo dos 9 Pontos"),
    "Geometry > Plane Geometry > Triangles > Triangle centers: centroid, incenter, circumcenter, orthocenter, Euler line, nine-point circle": ("Geometria Plana", "Triângulos", "Baricentro, Incentro, Circuncentro, Ortocentro"),
    "Geometry > Plane Geometry > Triangles > Triangle inequalities": ("Geometria Plana", "Triângulos", "Desigualdades no Triângulo"),
    "Geometry > Plane Geometry > Triangles > Triangle trigonometry": ("Trigonometria", "Trigonometria no Triângulo", "Leis dos Senos, Cossenos e Fórmulas de Área"),

    # GEOMETRIA ESPACIAL
    "Geometry > Solid Geometry > 3D Shapes": ("Geometria Espacial", "Sólidos Geométricos", "Poliedros e Corpos Redondos"),
    "Geometry > Solid Geometry > Other 3D problems": ("Geometria Espacial", "Geometria Espacial Geral", "Problemas Tridimensionais"),
    "Geometry > Solid Geometry > Surface Area": ("Geometria Espacial", "Sólidos Geométricos", "Área Superficial"),
    "Geometry > Solid Geometry > Volume": ("Geometria Espacial", "Sólidos Geométricos", "Cálculo de Volumes"),

    # TEORIA DOS NÚMEROS
    "Number Theory > Algebraic Number Theory > Algebraic numbers": ("Teoria dos Números", "Teoria Algébrica dos Números", "Números e Inteiros Algébricos"),
    "Number Theory > Algebraic Number Theory > Combinatorial number theory: van der Waerden's theorem": ("Teoria dos Números", "Teoria dos Números Combinatória", "Teorema de van der Waerden"),
    "Number Theory > Algebraic Number Theory > Quadratic fields": ("Teoria dos Números", "Teoria Algébrica dos Números", "Corpos Quadráticos"),
    "Number Theory > Algebraic Number Theory > Quadratic forms": ("Teoria dos Números", "Formas Quadráticas", "Representação por Formas Quadráticas"),
    "Number Theory > Algebraic Number Theory > Unique factorization": ("Teoria dos Números", "Teoria Algébrica dos Números", "Fatoração Única"),
    
    # EQUAÇÕES DIOFANTINAS
    "Number Theory > Diophantine Equations": ("Teoria dos Números", "Equações Diofantinas", "Equações Diofantinas Lineares e Não-Lineares"),
    "Number Theory > Diophantine Equations > Infinite descent / root flipping": ("Teoria dos Números", "Equações Diofantinas", "Descida Infinita de Fermat e Vieta Jumping"),
    "Number Theory > Diophantine Equations > Pell's equations": ("Teoria dos Números", "Equações Diofantinas", "Equações de Pell"),
    "Number Theory > Diophantine Equations > Pythagorean triples": ("Teoria dos Números", "Equações Diofantinas", "Ternos Pitagóricos"),
    "Number Theory > Diophantine Equations > Techniques: modulo, size analysis": ("Teoria dos Números", "Equações Diofantinas", "Técnicas de Análise Modular e Ordem de Grandeza"),
    "Number Theory > Diophantine Equations > Techniques: modulo, size analysis, order analysis, inequalities": ("Teoria dos Números", "Equações Diofantinas", "Técnicas Avançadas: Módulos, Ordens e Desigualdades"),

    # DIVISIBILIDADE E FATORAÇÃO
    "Number Theory > Divisibility / Factorization": ("Teoria dos Números", "Divisibilidade", "Critérios de Divisibilidade"),
    "Number Theory > Divisibility / Factorization > Factorization techniques": ("Teoria dos Números", "Divisibilidade", "Fatoração em Primos"),
    "Number Theory > Divisibility / Factorization > Greatest common divisors (gcd)": ("Teoria dos Números", "Divisibilidade", "Máximo Divisor Comum (MDC) e Algoritmo de Euclides"),
    "Number Theory > Divisibility / Factorization > Least common multiples (lcm)": ("Teoria dos Números", "Divisibilidade", "Mínimo Múltiplo Comum (MMC)"),
    "Number Theory > Divisibility / Factorization > Prime numbers": ("Teoria dos Números", "Números Primos", "Distribuição e Propriedades dos Primos"),

    # ARITMÉTICA MODULAR
    "Number Theory > Modular Arithmetic": ("Teoria dos Números", "Aritmética Modular", "Congruências Lineares"),
    "Number Theory > Modular Arithmetic > Chinese remainder theorem": ("Teoria dos Números", "Aritmética Modular", "Teorema Chinês dos Restos"),
    "Number Theory > Modular Arithmetic > Fermat / Euler / Wilson theorems": ("Teoria dos Números", "Aritmética Modular", "Pequeno Teorema de Fermat, Euler e Wilson"),
    "Number Theory > Modular Arithmetic > Inverses mod n": ("Teoria dos Números", "Aritmética Modular", "Inversos Modulares"),
    "Number Theory > Modular Arithmetic > Polynomials mod p": ("Teoria dos Números", "Aritmética Modular", "Polinômios a Coeficientes Modulares"),

    # FUNÇÕES ARITMÉTICAS
    "Number Theory > Number-Theoretic Functions": ("Teoria dos Números", "Funções Aritméticas", "Funções Multiplicativas"),
    "Number Theory > Number-Theoretic Functions > Möbius inversion": ("Teoria dos Números", "Funções Aritméticas", "Função de Möbius e Fórmula de Inversão"),
    "Number Theory > Number-Theoretic Functions > σ (sum of divisors)": ("Teoria dos Números", "Funções Aritméticas", "Soma dos Divisores (σ)"),
    "Number Theory > Number-Theoretic Functions > τ (number of divisors)": ("Teoria dos Números", "Funções Aritméticas", "Quantidade de Divisores (τ ou d)"),
    "Number Theory > Number-Theoretic Functions > φ (Euler's totient)": ("Teoria dos Números", "Funções Aritméticas", "Função Totiente de Euler (φ)"),
    "Number Theory > Other": ("Teoria dos Números", "Teoria dos Números Geral", "Problemas Diversos de Aritmética"),

    # RAÍZES PRIMITIVAS E RESÍDUOS
    "Number Theory > Residues and Primitive Roots > Multiplicative order": ("Teoria dos Números", "Resíduos e Ordens", "Ordem Multiplicativa"),
    "Number Theory > Residues and Primitive Roots > Primitive roots mod p / p^n": ("Teoria dos Números", "Resíduos e Ordens", "Raízes Primitivas"),
    "Number Theory > Residues and Primitive Roots > Quadratic reciprocity": ("Teoria dos Números", "Resíduos e Ordens", "Lei da Reciprocidade Quadrática e Símbolo de Legendre"),
    "Number Theory > Residues and Primitive Roots > Quadratic residues": ("Teoria dos Números", "Resíduos e Ordens", "Resíduos Quadráticos"),
}

def traduzir_taxonomia_mathnet(topico_raw: Optional[str]) -> Tuple[str, str, str]:
    """
    Traduz qualquer tópico bruto do MathNet para (materia, topico, subtopico).
    Se já estiver em português ou for nulo, retorna categorias canônicas limpas.
    """
    if topico_raw is None:
        return ("Álgebra", "Geral", "Álgebra Geral")

    # Extrai string se for lista ou array (evita 'truth value of array is ambiguous')
    if hasattr(topico_raw, '__iter__') and not isinstance(topico_raw, str):
        itens = [str(x).strip() for x in topico_raw if str(x).strip()]
        topico_str = itens[0] if itens else ""
    else:
        topico_str = str(topico_raw).strip()

    if not topico_str or topico_str.lower() in ("nan", "none", "<na>"):
        return ("Álgebra", "Geral", "Álgebra Geral")

    # 1. Busca exata no dicionário canônico
    if topico_str in TAXONOMIA_EXATA:
        return TAXONOMIA_EXATA[topico_str]

    # Normaliza espaços extras
    topico_normalizado = re.sub(r"\s+", " ", topico_str)
    if topico_normalizado in TAXONOMIA_EXATA:
        return TAXONOMIA_EXATA[topico_normalizado]

    # 2. Heurística hierárquica por palavras-chave se for variante desconhecida
    t_low = topico_str.lower()
    if "number theory" in t_low:
        return ("Teoria dos Números", "Teoria dos Números", topico_str.split(" > ")[-1])
    elif "geometry" in t_low or "triangle" in t_low or "circle" in t_low:
        if "solid" in t_low or "3d" in t_low:
            return ("Geometria Espacial", "Sólidos Geométricos", topico_str.split(" > ")[-1])
        elif "analytic" in t_low or "cartesian" in t_low:
            return ("Geometria Analítica", "Plano Cartesiano", topico_str.split(" > ")[-1])
        return ("Geometria Plana", "Geometria Plana", topico_str.split(" > ")[-1])
    elif "polynomial" in t_low or "complex" in t_low:
        return ("Polinômios e Complexos", "Polinômios e Complexos", topico_str.split(" > ")[-1])
    elif "calculus" in t_low or "limit" in t_low or "derivative" in t_low or "integral" in t_low:
        return ("Cálculo", "Cálculo Diferencial e Integral", topico_str.split(" > ")[-1])
    elif "combinator" in t_low or "discrete" in t_low or "graph" in t_low or "probab" in t_low:
        return ("Probabilidade e Combinatória", "Análise Combinatória", topico_str.split(" > ")[-1])
    elif "linear algebra" in t_low or "matrix" in t_low or "vector" in t_low:
        return ("Álgebra Linear", "Álgebra Linear", topico_str.split(" > ")[-1])
    elif "trigonometr" in t_low:
        return ("Trigonometria", "Trigonometria", topico_str.split(" > ")[-1])
    else:
        return ("Álgebra", "Álgebra Geral", topico_str.split(" > ")[-1])

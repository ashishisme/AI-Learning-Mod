// SPEC: FR-QZ-01, FR-QZ-02, FR-QZ-03, FR-QZ-04
export interface QuizOption {
  text: string
}

export interface QuizQuestion {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  rationale: string
  hintKeyword: string
}

export interface LessonQuiz {
  lessonId: string
  title: string
  description: string
  questions: QuizQuestion[]
}

export const QUIZ_DATA: Record<string, LessonQuiz> = {
  '1-intro': {
    lessonId: '1-intro',
    title: 'Introduction to AI Quiz',
    description: 'Test your understanding of core AI definitions, Strong vs. Weak AI, and the Turing Test.',
    questions: [
      {
        id: 'q1',
        prompt: 'What distinguishes "Weak AI" (Narrow AI) from "Strong AI" (AGI)?',
        options: [
          'Weak AI runs on CPUs, while Strong AI strictly runs on quantum computers.',
          'Weak AI is specialized for specific predefined tasks, while Strong AI possesses general human-level cognitive adaptability.',
          'Weak AI cannot use neural networks, only symbolic logic.',
          'Weak AI only processes text, whereas Strong AI processes video.'
        ],
        correctIndex: 1,
        rationale: 'According to [Lesson § Weak AI vs. Strong AI], Weak AI excels in narrow, predefined domains (like Siri or chess), whereas Strong AI represents generalized human-level reasoning across any domain.',
        hintKeyword: 'Weak AI vs Strong AI'
      },
      {
        id: 'q2',
        prompt: 'How did Alan Turing define machine intelligence in the Turing Test?',
        options: [
          'By measuring whether the algorithm achieves 100% accuracy on a math dataset.',
          'By testing if a human interrogator in a text dialogue cannot distinguish the machine from a human.',
          'By inspecting the source code for biological neuron simulation.',
          'By calculating the number of parameters in the knowledge base.'
        ],
        correctIndex: 1,
        rationale: 'According to [Lesson § The Definition of Intelligence and the Turing Test], if a human interrogator cannot tell whether answers in text dialogue come from a machine or human, the machine exhibits intelligent behavior.',
        hintKeyword: 'Turing Test definition'
      },
      {
        id: 'q3',
        prompt: 'What is the fundamental difference between the top-down and bottom-up approaches to AI?',
        options: [
          'Top-down models human reasoning with symbolic knowledge rules; bottom-up models biological neurons and learns from data.',
          'Top-down is used only for computer vision, whereas bottom-up is used for chess.',
          'Top-down requires GPU acceleration, while bottom-up uses rule-based databases.',
          'Top-down was invented after 2012, while bottom-up was invented by Babbage.'
        ],
        correctIndex: 0,
        rationale: 'According to [Lesson § Different Approaches to AI], top-down symbolic reasoning formalizes expert rules, while bottom-up neural approaches simulate interconnected artificial neurons trained on data.',
        hintKeyword: 'top-down vs bottom-up approaches'
      }
    ]
  },
  '2-symbolic': {
    lessonId: '2-symbolic',
    title: 'Symbolic AI & Knowledge Representation Quiz',
    description: 'Test your mastery of expert systems, ontologies, and production rules.',
    questions: [
      {
        id: 'q1',
        prompt: 'What was the primary bottleneck that contributed to the historic "AI Winter" in expert systems?',
        options: [
          'Computers completely ran out of disk storage for text files.',
          'Extracting tacit knowledge from human experts and maintaining accurate rule bases became too complex and costly.',
          'Symbolic systems could not compute floating-point multiplications.',
          'Neural networks were outlawed by academic research councils.'
        ],
        correctIndex: 1,
        rationale: 'According to [Lesson § A Brief History of AI], the knowledge acquisition bottleneck and difficulty of maintaining massive rule-bases made symbolic expert systems impractical to scale.',
        hintKeyword: 'AI winter expert systems bottleneck'
      },
      {
        id: 'q2',
        prompt: 'In a production rule system, how are decisions formulated?',
        options: [
          'Through gradient descent backpropagation.',
          'Using IF-THEN conditional assertions matched against working memory.',
          'Via random walks through Markov decision processes.',
          'By pixel clustering in Euclidean space.'
        ],
        correctIndex: 1,
        rationale: 'Production rule systems represent knowledge as IF <condition> THEN <action> rules executed against current facts.',
        hintKeyword: 'production rules IF THEN'
      }
    ]
  },
  '3-neuralnetworks': {
    lessonId: '3-neuralnetworks',
    title: 'Neural Networks Foundations Quiz',
    description: 'Evaluate your grasp of artificial neurons, activation functions, and training.',
    questions: [
      {
        id: 'q1',
        prompt: 'Why are non-linear activation functions (e.g. ReLU, Sigmoid) necessary in multi-layer perceptrons?',
        options: [
          'Without non-linear activations, multi-layer networks collapse mathematically into a single linear transformation.',
          'They prevent the computer from overheating during matrix multiplication.',
          'They reduce the weight count to zero.',
          'They convert continuous numbers into integers for faster storage.'
        ],
        correctIndex: 0,
        rationale: 'The composition of consecutive linear transformations is strictly linear. Non-linear activation functions allow neural networks to approximate arbitrary non-linear functions.',
        hintKeyword: 'non-linear activation functions'
      },
      {
        id: 'q2',
        prompt: 'What is the role of backpropagation during neural network optimization?',
        options: [
          'It deletes unused neurons from computer RAM.',
          'It computes the gradient of the loss function with respect to each weight using the calculus chain rule.',
          'It scrambles input labels to verify memorization.',
          'It converts floating-point weights into binary integers.'
        ],
        correctIndex: 1,
        rationale: 'Backpropagation applies the chain rule in reverse from the output layer to compute parameter gradients for gradient descent.',
        hintKeyword: 'backpropagation chain rule gradients'
      }
    ]
  },
  '4-computervision': {
    lessonId: '4-computervision',
    title: 'Computer Vision & CNNs Quiz',
    description: 'Verify your knowledge of image filters, pooling, and convolutional architectures.',
    questions: [
      {
        id: 'q1',
        prompt: 'What advantage do Convolutional Neural Networks (CNNs) have over fully-connected networks for image processing?',
        options: [
          'CNNs require no training data whatsoever.',
          'CNNs exploit spatial locality and translation invariance through shared filter weights.',
          'CNNs only process grayscale 8x8 images.',
          'CNNs avoid using matrix multiplications.'
        ],
        correctIndex: 1,
        rationale: 'Convolutions slide small weight kernels across the image, recognizing features regardless of their exact spatial location with vastly fewer parameters.',
        hintKeyword: 'convolutional weight sharing spatial locality'
      }
    ]
  },
  '5-nlp': {
    lessonId: '5-nlp',
    title: 'Natural Language Processing Quiz',
    description: 'Test your understanding of embeddings, language models, and transformers.',
    questions: [
      {
        id: 'q1',
        prompt: 'What key innovation enabled the Transformer architecture to surpass traditional RNNs and LSTMs in NLP?',
        options: [
          'Removing all attention mechanisms in favor of larger character tables.',
          'Self-attention mechanisms that process entire token sequences in parallel without recurrent recurrence bottlenecks.',
          'Eliminating tokenization and training directly on raw audio waveforms.',
          'Using fixed dictionary lookups instead of matrix multiplications.'
        ],
        correctIndex: 1,
        rationale: 'Self-attention allows direct modeling of relationships between all tokens in parallel, avoiding the sequential computation bottleneck of RNNs.',
        hintKeyword: 'transformer self-attention parallel computation'
      }
    ]
  }
}

export function getQuizForLesson(lessonId: string, lessonTitle?: string): LessonQuiz {
  if (QUIZ_DATA[lessonId]) {
    return QUIZ_DATA[lessonId]
  }
  // Generic fallback quiz for other lessons
  return {
    lessonId,
    title: `${lessonTitle || 'Lesson'} Comprehension Check`,
    description: 'Review key concepts and check your comprehension from this module.',
    questions: [
      {
        id: 'q1',
        prompt: `Based on the lesson content for "${lessonTitle || lessonId}", which statement best characterizes its primary objective?`,
        options: [
          'To establish formal foundational principles and practical methodology in artificial intelligence.',
          'To replace all computer hardware with analog vacuum tubes.',
          'To prove that computers cannot solve numerical problems.',
          'To memorize syntax without understanding model architectures.'
        ],
        correctIndex: 0,
        rationale: 'This lesson presents core theoretical concepts, architectural patterns, and practical AI applications.',
        hintKeyword: 'core concepts'
      },
      {
        id: 'q2',
        prompt: 'How does grounding in AI learning systems improve learner reliability?',
        options: [
          'By inventing answers freely without referencing source documentation.',
          'By constraining responses to verified curriculum content and citing specific section headings.',
          'By requiring students to run local compiler builds before asking questions.',
          'By disabling all AI feedback entirely.'
        ],
        correctIndex: 1,
        rationale: 'Grounding anchors answers strictly to verified lesson text and provides verifiable section citations.',
        hintKeyword: 'grounding and citations'
      }
    ]
  }
}

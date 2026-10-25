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
      },
      {
        id: 'q4',
        prompt: 'Which historic 1956 event is widely recognized as the birth of Artificial Intelligence as an academic discipline?',
        options: [
          'The Dartmouth Summer Research Project on Artificial Intelligence, organized by John McCarthy, Marvin Minsky, and colleagues.',
          'The release of the first iPhone in Cupertino.',
          'The publication of Charles Babbage’s Analytical Engine notes.',
          'The victory of Deep Blue over Garry Kasparov in New York.'
        ],
        correctIndex: 0,
        rationale: 'The term "Artificial Intelligence" was coined at the Dartmouth Summer Research Project in 1956, officially launching AI as a distinct field of scientific inquiry.',
        hintKeyword: 'Dartmouth conference 1956 McCarthy'
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
      },
      {
        id: 'q3',
        prompt: 'What is the distinction between forward chaining and backward chaining in inference engines?',
        options: [
          'Forward chaining is data-driven starting from known facts to reach conclusions; backward chaining is goal-driven starting from a hypothesis to find supporting facts.',
          'Forward chaining operates on text, while backward chaining operates on images.',
          'Forward chaining requires GPUs, whereas backward chaining requires quantum chips.',
          'Forward chaining was developed in 2020, while backward chaining is from the 19th century.'
        ],
        correctIndex: 0,
        rationale: 'Forward chaining starts with known data and applies rules to deduce new facts. Backward chaining starts with a goal hypothesis and works backward to see if known facts support it.',
        hintKeyword: 'forward chaining data-driven backward chaining goal-driven'
      },
      {
        id: 'q4',
        prompt: 'What is the primary role of an ontology in knowledge representation?',
        options: [
          'To compress video files into smaller zip archives.',
          'To define a formal, explicit specification of shared domain concepts, relationships, and categories.',
          'To randomly initialize weights in deep learning layers.',
          'To benchmark GPU memory bandwidth during training.'
        ],
        correctIndex: 1,
        rationale: 'An ontology formally defines domain entities, properties, taxonomies, and relationships so machines can reason about structured knowledge unambiguously.',
        hintKeyword: 'ontology conceptual formalization'
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
      },
      {
        id: 'q3',
        prompt: 'How does the Dropout regularization technique help prevent overfitting in deep neural networks?',
        options: [
          'By randomly dropping entire layers from the network permanently during inference.',
          'By randomly deactivating a subset of neurons during training to prevent co-adaptation of features.',
          'By increasing the training dataset size by duplicating identical images.',
          'By setting all weights to zero at the start of every epoch.'
        ],
        correctIndex: 1,
        rationale: 'Dropout randomly temporarily zeroes activations of neurons during training batches, forcing neurons to learn robust, generalized representations rather than memorizing co-dependent patterns.',
        hintKeyword: 'dropout regularization co-adaptation'
      },
      {
        id: 'q4',
        prompt: 'What happens if the learning rate in gradient descent is chosen to be excessively large?',
        options: [
          'The optimization may overshoot the minimum, oscillate wildly, or diverge entirely.',
          'The training will instantly halt and delete the model weights.',
          'The network will automatically achieve 100% accuracy on all validation datasets.',
          'The weights will freeze and never change.'
        ],
        correctIndex: 0,
        rationale: 'An excessively large learning rate causes updates to step past optimal loss minima, causing numerical instability, loss explosion, and divergence.',
        hintKeyword: 'learning rate divergence oscillation'
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
      },
      {
        id: 'q2',
        prompt: 'What is the primary function of a Max Pooling layer in a Convolutional Neural Network?',
        options: [
          'To double the spatial resolution of feature maps.',
          'To downsample feature map dimensions, reduce computational complexity, and provide slight translation invariance.',
          'To compute backward gradients using symbolic logic.',
          'To convert color channels into text strings.'
        ],
        correctIndex: 1,
        rationale: 'Max pooling selects the maximum activation within local patches (e.g. 2x2), halving spatial dimensions while preserving the most salient feature activations.',
        hintKeyword: 'max pooling downsampling translation invariance'
      },
      {
        id: 'q3',
        prompt: 'Why is Transfer Learning widely utilized in computer vision applications?',
        options: [
          'Because training deep vision backbones (like ResNet) from scratch requires massive datasets and compute; fine-tuning pre-trained weights works effectively with small datasets.',
          'Because pre-trained vision models cannot be altered once trained.',
          'Because transfer learning eliminates the need for testing or validation.',
          'Because transfer learning only works on sound files.'
        ],
        correctIndex: 0,
        rationale: 'Features learned in early layers of deep models on huge datasets (like ImageNet) capture universal visual features (edges, textures, shapes) that transfer effectively to specialized custom tasks.',
        hintKeyword: 'transfer learning pre-trained fine-tuning'
      },
      {
        id: 'q4',
        prompt: 'What distinguishes Object Detection from standard Image Classification?',
        options: [
          'Image classification outputs a single class label for the whole image; object detection localizes and classifies multiple objects with bounding boxes.',
          'Image classification predicts 3D coordinates, whereas object detection predicts colors.',
          'Object detection only works on text documents, not images.',
          'Image classification requires video cameras, while object detection uses text files.'
        ],
        correctIndex: 0,
        rationale: 'Classification categorizes what is in the image, whereas object detection identifies what objects are present and where they are located via bounding box coordinates.',
        hintKeyword: 'object detection bounding box localization'
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
      },
      {
        id: 'q2',
        prompt: 'How do dense Word Embeddings (e.g. Word2Vec, GloVe) represent word meaning mathematically?',
        options: [
          'As one-hot vectors where every word is orthogonal and equidistant from every other word.',
          'As continuous low-dimensional vectors where semantically similar words are positioned close together in vector space.',
          'As random alphanumeric strings generated per sentence.',
          'As ASCII character codes summed together.'
        ],
        correctIndex: 1,
        rationale: 'Dense embeddings map words into geometric vector spaces where semantic similarity corresponds to cosine distance, enabling analogies like king - man + woman = queen.',
        hintKeyword: 'word embeddings dense vector space semantic similarity'
      },
      {
        id: 'q3',
        prompt: 'What problem in classic Recurrent Neural Networks (RNNs) do LSTMs and GRUs specifically address?',
        options: [
          'The inability to run on CPU processors.',
          'Vanishing and exploding gradients across long time steps, resolved through gating mechanisms that regulate information flow.',
          'The complete absence of matrix multiplication operations.',
          'Lack of support for Unicode text characters.'
        ],
        correctIndex: 1,
        rationale: 'Gated cells (like LSTM forget, input, and output gates) create uninterrupted gradient highways, allowing recurrent models to retain dependencies over long sequences.',
        hintKeyword: 'vanishing gradients LSTM gating mechanisms'
      },
      {
        id: 'q4',
        prompt: 'What is the fundamental architectural difference between Encoder-only models (e.g. BERT) and Decoder-only models (e.g. GPT)?',
        options: [
          'Encoder-only models use bidirectional attention for deep representation understanding; Decoder-only models use causal masking for autoregressive generative prediction.',
          'Encoder-only models are used for speech synthesis; Decoder-only models are used for robotics.',
          'Encoder-only models cannot be trained with gradient descent.',
          'Decoder-only models only process single characters.'
        ],
        correctIndex: 0,
        rationale: 'BERT attends to left and right context simultaneously for classification/extraction, while GPT masks future tokens to predict the next token in sequence.',
        hintKeyword: 'encoder bidirectional decoder causal autoregressive'
      }
    ]
  },
  '7-ethics': {
    lessonId: '7-ethics',
    title: 'Ethical and Responsible AI Quiz',
    description: 'Assess your understanding of AI bias, transparency, environmental impact, and accountability.',
    questions: [
      {
        id: 'q1',
        prompt: 'How does algorithmic bias typically enter modern machine learning systems?',
        options: [
          'Through hardware defects in computer memory modules.',
          'When models are trained on historical datasets that reflect societal prejudices, historical inequities, or skewed demographic sampling.',
          'By using too many layers in deep neural network architectures.',
          'Only when programmers explicitly code discriminatory rules.'
        ],
        correctIndex: 1,
        rationale: 'Machine learning models inherit and amplify prejudices and sampling gaps present in historical training datasets unless actively audited and mitigated.',
        hintKeyword: 'algorithmic bias dataset representation'
      },
      {
        id: 'q2',
        prompt: 'Why is Explainability and Interpretability critical for deploying AI in high-stakes domains (like healthcare and law)?',
        options: [
          'To ensure the software compiles with zero warnings.',
          'So human practitioners can understand, audit, and validate the reasoning behind model recommendations before acting on them.',
          'To prevent models from using floating-point numbers.',
          'To make neural networks run faster on mobile devices.'
        ],
        correctIndex: 1,
        rationale: 'In high-stakes settings, opaque "black-box" decisions can cause catastrophic harm; explainability enables domain experts to detect errors, spurious correlations, and biases.',
        hintKeyword: 'explainability interpretability high-stakes decisions'
      },
      {
        id: 'q3',
        prompt: 'What environmental concern is increasingly scrutinized with the scaling of frontier foundation models?',
        options: [
          'The immense electricity consumption and carbon footprint required to power massive GPU clusters during training and inference.',
          'The physical weight of hard drives bending computer racks.',
          'Depletion of magnetic disk storage on earth.',
          'Sound pollution from computer cooling fans.'
        ],
        correctIndex: 0,
        rationale: 'Training massive modern AI models requires millions of kilowatt-hours of electrical power and substantial water cooling, raising urgent sustainability concerns.',
        hintKeyword: 'environmental impact energy consumption carbon footprint'
      },
      {
        id: 'q4',
        prompt: 'What does the "Human-in-the-Loop" (HITL) principle mandate in responsible AI deployment?',
        options: [
          'Humans must manually calculate all backpropagation gradients by hand.',
          'Crucial decision-making authority must remain with accountable human operators who review and oversee autonomous AI outputs.',
          'Users must click a button every five seconds to keep models active.',
          'Every AI model must simulate a human brain structure exactly.'
        ],
        correctIndex: 1,
        rationale: 'Responsible AI frameworks require meaningful human oversight and accountability rather than fully unmonitored automated decision delegation.',
        hintKeyword: 'human in the loop accountability oversight'
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

[![Netlify Status](https://api.netlify.com/api/v1/badges/ceca7de4-698d-41a1-b520-2d988072ad82/deploy-status)](https://app.netlify.com/projects/senathsethmika/deploys)
# EduCore AI – Real-time AI Help for A/L Students in Sri Lanka 🇱🇰

**EduCore AI** is a powerful educational assistant built for Sri Lankan **Advanced Level (A/L)** students studying **Combined Mathematics, Physics, Chemistry, or Biology**. Powered by cutting-edge AI, it provides **instant, syllabus-aligned answers** to academic questions — 24/7.

---

## 🎯 Who Is It For?

- **Students** looking for step-by-step answers and concept clarity.
- **Teachers & Mass Classes** who want to empower their entire class with advanced AI support.
- **Institutes** seeking to offer modern, digital learning tools to enhance student performance.

---

## 🚀 Features

### 🧠 For Students:
- 📚 **Real-time Q&A** for Combined Maths, Physics, Chemistry & Biology
- 🤖 AI trained with local exam formats and past paper styles
- 🔄 Ask unlimited academic questions, anytime
- 🧪 Clear, exam-focused explanations with step-by-step breakdowns
- 💬 Sinhala and English language support

### 👨‍🏫 For Teachers & Institutes:
- 🛠️ Central dashboard to manage all students
- 📊 Student activity reports (questions asked, topics studied)
- 🧑‍🎓 Bulk account creation for entire classes
- 🧠 Optionally tailor AI response style to your teaching approach
- 🎓 Custom institute/class login page with your branding

---

## 📱 Platform Access

EduCore AI is available as:
- A Web App (Desktop & Mobile responsive)
- Soon to be available on **Android** and **iOS**

Use any device with a browser and internet connection to:
- Log in
- Ask questions
- View history
- Monitor your learning

---

## 💻 Tech Stack

EduCore AI is built with a modern, scalable, and AI-first technology stack:

- **Frontend:**
    - [Next.js](https://nextjs.org/) - React framework for server-side rendering and static site generation.
    - [TypeScript](https://www.typescriptlang.org/) - Superset of JavaScript that adds static typing.
    - [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework for rapid UI development.
    - [Shadcn/ui](https://ui.shadcn.com/) - Re-usable UI components built with Radix UI and Tailwind CSS.
- **Backend & AI:**
    - [Firebase](https://firebase.google.com/) - Platform for building web and mobile applications (used for Authentication, Database, and Hosting).
    - [Genkit (Google AI)](https://ai.google.dev/genkit) - Open-source framework for building AI-powered applications.
- **Deployment:**
    - [Netlify](https://www.netlify.com/) - Platform for hosting and serverless backend services.

---

## ⚙️ Installation/Setup

Follow these steps to set up and run the project locally:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Senath-Sethmika/EduCore-AI.git
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd EduCore-AI
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of your project and add your Firebase configuration. You can get these from your Firebase project settings.

    ```plaintext
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
    ```
    **Note:** These are `NEXT_PUBLIC_` variables, which are essential for Next.js to expose them to the browser. Ensure you replace `your_...` placeholders with your actual Firebase project credentials.

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🛠️ Getting Started

1. Visit the [EduCore AI Website](https://educore-ai.netlify.app/)
2. Sign up as a **Student** or **Teacher**
3. For institutes, contact us to register your class and onboard your students
4. Start learning – ask your academic questions and receive instant answers from our AI assistant

---

## 🙌 Contributing

We welcome contributions from the community! Whether you're fixing a bug, adding a new feature, or improving documentation, your help is appreciated.

Here's how you can contribute:

1.  **Reporting Bugs or Suggesting Features:**
    - If you find a bug or have an idea for a new feature, please open an issue on our [GitHub Issues page](https://github.com/Senath-Sethmika/EduCore-AI/issues).
    - Provide as much detail as possible, including steps to reproduce for bugs.

2.  **Coding Standards:**
    - Try to follow the existing code style and structure.
    - Write clean, readable, and maintainable code.
    - Ensure your code is well-commented, especially in complex areas.

3.  **Branch Naming Conventions:**
    - For new features: `feature/your-feature-name` (e.g., `feature/user-profile-page`)
    - For bug fixes: `bugfix/issue-number` or `bugfix/short-description` (e.g., `bugfix/123` or `bugfix/login-error`)
    - For documentation changes: `docs/update-readme`

4.  **Pull Request (PR) Process:**
    - Fork the repository to your own GitHub account.
    - Create a new branch from `main` using the naming conventions above.
    - Make your changes in your new branch.
    - Test your changes thoroughly.
    - Push your branch to your forked repository.
    - Open a Pull Request (PR) to the `main` branch of the original repository.
    - Provide a clear and concise title and description for your PR.
    - Reference any relevant issues in your PR description (e.g., "Closes #123").
    - Ensure your PR passes any automated checks or tests.

We're excited to see your contributions and build a better EduCore AI together!

---

## 📥 Support & Contact

Need help or want to onboard your class or institute?

📧 Email: `educore.ai.dev@gmail.com`  
🌐 Website: [https://educore-ai.netlify.app/](https://educore-ai.netlify.app/)  
📱 WhatsApp: +94 762259050

---

## 📜 License

EduCore AI is licensed under a custom license. We grant permission for the following uses (see [LICENSE.txt](LICENSE.txt) for full details):

- **Personal Use:** You are free to use, modify, and distribute the code for your own personal projects.
- **Educational Use:** Students, teachers, and educational institutions are welcome to use and adapt the code for learning and teaching purposes.
- **Non-Commercial Use:** You may use this project for non-commercial activities, provided that it does not involve direct or indirect financial gain.

**Prohibition of Commercial Use:**
Commercial use, reproduction, distribution, or modification of this project or its derivatives for direct or indirect financial gain is strictly prohibited without explicit prior written permission from **Senath Sethmika**.

For the complete license terms, please refer to the [LICENSE.txt](LICENSE.txt) file included in this repository.

---

## 🧑‍💻 Built By

**Senath Sethmika** and the team at [Xtream Developers](https://github.com/Senath-Sethmika)  
Passionate about transforming education with technology and empowering future minds in Sri Lanka.

---

> “Let AI be your second teacher. Ask. Learn. Succeed.” 🚀

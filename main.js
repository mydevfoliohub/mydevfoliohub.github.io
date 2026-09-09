  const SUPABASE_URL = "https://mjwtiliulpolrypywkei.supabase.co";

  const SUPABASE_KEY = "sb_publishable_bzk-PSNChJcwFG42CqKcOg_PPhY-Wad";

  const PUBLIC_SITE_URL =
    "https://mydevfoliohub.github.io/";

  const supabaseClient =
    supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );
  let currentUser = null;
  let signedInProfile = null;
  let activePortfolioUserId = null;
  let activePortfolioUsername = "";
  let isPlatformAdmin = false;

  // Kept for compatibility with the existing editor functions.
  // It now means "the signed-in owner is viewing Dashboard mode".
  let isAdmin = false;

  let currentAppView = "loading";
  let authMode = "login";
  let passwordRecoveryEventReceived = false;


  const USERNAME_PATTERN =
    /^[a-z0-9_-]{3,30}$/;


  const GITHUB_USERNAME_PATTERN =
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;


  const DEFAULT_SECTION_ORDER = {
    profile: [
      "socials",
      "tech_stack"
    ],
    content: [
      "projects",
      "github_highlights",
      "labs",
      "learning_log",
      "currently_learning",
      "education",
      "achievements",
      "testimonials",
      "growth",
      "knowledge",
      "certificates",
      "contact"
    ]
  };


  const SECTION_LABELS = {
    socials: "Socials",
    tech_stack: "Tech Stack",
    projects: "Projects",
    github_highlights: "GitHub Highlights",
    labs: "Labs",
    learning_log: "Learning Log",
    currently_learning: "Currently Learning",
    education: "Education",
    achievements: "Achievements & Badges",
    testimonials: "Testimonials",
    growth: "Growth Hub",
    knowledge: "Knowledge Base",
    certificates: "Certificates",
    contact: "Contact"
  };


  const PROFILE_SPECIALTIES = {
    cybersecurity: "Cybersecurity",
    frontend: "Frontend",
    backend: "Backend",
    fullstack: "Full Stack",
    mobile: "Mobile",
    data_ai: "Data & AI",
    devops_cloud: "DevOps & Cloud",
    other: "Other"
  };


  const PORTFOLIO_THEMES = {
    cyber: "Cyber",
    minimal: "Minimal",
    github: "GitHub",
    modern: "Modern",
    purple: "Purple"
  };


  let userSearchTimer = null;
  let userSearchRequestId = 0;
  let featuredPortfolioRequestId = 0;
  let onboardingPreviewImageUrl = "";
  let portfolioThemeDatabaseReady = false;
  let currentLayoutOrder =
    JSON.parse(
      JSON.stringify(
        DEFAULT_SECTION_ORDER
      )
    );


  supabaseClient.auth.onAuthStateChange(
    (event, session) => {

      if (event === "SIGNED_OUT") {
        currentUser = null;
        signedInProfile = null;
        activePortfolioUserId = null;
        activePortfolioUsername = "";
        isAdmin = false;
        isPlatformAdmin = false;
        window.setTimeout(() => syncAccountControls(), 0);
        return;
      }

      if (event !== "PASSWORD_RECOVERY") return;


      passwordRecoveryEventReceived = true;
      currentUser = session?.user || null;


      window.setTimeout(
        () => showPasswordReset(),
        0
      );
    }
  );


  function showAppView(viewName) {

    const views = {
      landing: "landingView",
      community: "communityView",
      auth: "authView",
      onboarding: "onboardingView",
      notFound: "userNotFoundView",
      portfolio: "portfolioView"
    };


    Object.entries(views)
      .forEach(
        ([name, elementId]) => {

          const element =
            document.getElementById(
              elementId
            );


          if (element) {
            element.hidden =
              name !== viewName;
          }

        }
      );


    const loading =
      document.getElementById(
        "appLoading"
      );


    if (loading) {
      loading.hidden = true;
    }


    currentAppView = viewName;


    if (viewName === "landing") {
      window.setTimeout(
        () => {
          initializeLandingExperience();


        },
        0
      );
    }
    else {
      clearLandingTerminalTimers();
    }

    window.scrollTo({
      top: 0,
      behavior: "auto"
    });
  }


  function getBasePageURL() {

    const url =
      new URL(window.location.href);


    url.search = "";
    url.hash = "";


    return url;
  }


  function buildPortfolioURL(username) {

    const url =
      getBasePageURL();


    url.searchParams.set(
      "u",
      String(username || "")
        .toLowerCase()
    );


    return url.href;
  }


  function extractGitHubUsername(value) {

    const rawValue =
      String(value || "").trim();


    if (!rawValue) {
      return "";
    }


    if (
      GITHUB_USERNAME_PATTERN
        .test(rawValue)
    ) {
      return rawValue;
    }


    try {
      const url = new URL(rawValue);


      if (
        ![
          "github.com",
          "www.github.com"
        ].includes(
          url.hostname.toLowerCase()
        )
      ) {
        return "";
      }


      const username =
        url.pathname
          .split("/")
          .filter(Boolean)[0]
        ||
        "";


      return GITHUB_USERNAME_PATTERN
        .test(username)
          ? username
          : "";
    }

    catch {
      return "";
    }
  }


  function togglePortfolioMenu() {
    const button = document.getElementById("portfolioMenuButton");
    button.setAttribute("aria-expanded", String(button.getAttribute("aria-expanded") !== "true"));
  }

  function navigateToLanding() {
    window.location.href =
      getBasePageURL().href;
  }


  function navigateToCommunity() {
    const url = getBasePageURL();
    url.searchParams.set("view", "community");
    window.location.href = url.href;
  }


  function scrollToCommunity() {
    navigateToCommunity();
  }


  function openDemoPortfolio() {
    window.location.href =
      buildPortfolioURL("bassam");
  }


  function handleUserSearchInput(value) {

    window.clearTimeout(
      userSearchTimer
    );


    userSearchTimer =
      window.setTimeout(
        () => {
          loadPublicUserDirectory(
            value
          );
        },
        300
      );
  }


  function renderPublicUserCards(
    profiles
  ) {

    const container =
      document.getElementById(
        "userSearchResults"
      );


    if (!container) {
      return;
    }


    container.innerHTML = "";


    profiles.forEach(profile => {
      const card =
        document.createElement("a");

      card.className =
        "user-result-card";

      card.href =
        buildPortfolioURL(
          profile.username
        );


      const avatar =
        document.createElement("span");

      avatar.className =
        "user-result-avatar";


      if (profile.image_path) {
        const image =
          document.createElement("img");

        image.src =
          getProfileImageURL(
            profile.image_path
          );

        image.alt = "";
        image.loading = "lazy";

        image.addEventListener(
          "error",
          () => {
            avatar.textContent =
              getProfileInitials(
                profile.display_name
              );
          },
          { once: true }
        );

        avatar.appendChild(image);
      }

      else {
        avatar.textContent =
          getProfileInitials(
            profile.display_name
          );
      }


      const copy =
        document.createElement("span");

      copy.className =
        "user-result-copy";


      const name =
        document.createElement("strong");

      name.textContent =
        profile.display_name
        || profile.username;


      const username =
        document.createElement("span");

      username.textContent =
        `@${profile.username}`;


      const details =
        document.createElement("small");


      const specialtyLabel =
        PROFILE_SPECIALTIES[profile.specialty]
        || "";


      const technologies =
        Array.isArray(profile.tech_stack)
          ? profile.tech_stack.slice(0, 3)
          : [];


      details.textContent =
        [specialtyLabel, ...technologies]
          .filter(Boolean)
          .join(" · ");


      copy.appendChild(name);
      copy.appendChild(username);


      if (details.textContent) {
        copy.appendChild(details);
      }
      card.appendChild(avatar);
      card.appendChild(copy);
      container.appendChild(card);
    });
  }


  function syncDirectoryQuickFilters() {
    const specialty =
      document.getElementById("userSpecialtyFilter")?.value || "";

    document
      .querySelectorAll(".directory-filter-chip")
      .forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.specialty === specialty
        );
      });
  }


  function handleDirectoryFilterChange() {
    syncDirectoryQuickFilters();
    loadPublicUserDirectory(
      document.getElementById("userSearchInput")?.value || ""
    );
  }


  function setDirectorySpecialty(value, button) {
    if (!Object.prototype.hasOwnProperty.call(PROFILE_SPECIALTIES, value) && value !== "") {
      return;
    }

    const select = document.getElementById("userSpecialtyFilter");
    if (!select) return;

    select.value = value;
    syncDirectoryQuickFilters();
    loadPublicUserDirectory(
      document.getElementById("userSearchInput")?.value || ""
    );

    button?.focus({ preventScroll: true });
  }


  async function sortPublicProfiles(profiles, sortMode) {
    const sorted = [...profiles];

    if (sortMode === "name") {
      return sorted.sort((first, second) =>
        String(first.display_name || first.username).localeCompare(
          String(second.display_name || second.username),
          "en",
          { sensitivity: "base" }
        )
      );
    }

    if (sortMode === "most_viewed" && sorted.length) {
      const userIds = sorted.map(profile => profile.user_id);
      const { data, error } = await supabaseClient
        .from("content_views")
        .select("user_id, view_count")
        .eq("content_type", "portfolio")
        .in("user_id", userIds);

      if (!error) {
        const viewMap = new Map(
          (data || []).map(item => [item.user_id, Number(item.view_count) || 0])
        );

        return sorted.sort((first, second) =>
          (viewMap.get(second.user_id) || 0) - (viewMap.get(first.user_id) || 0)
          || String(first.display_name || first.username).localeCompare(
            String(second.display_name || second.username),
            "en",
            { sensitivity: "base" }
          )
        );
      }
    }

    return sorted.sort((first, second) =>
      new Date(second.created_at || 0).getTime()
      - new Date(first.created_at || 0).getTime()
    );
  }


  function createFeaturedPortfolioCard(profile) {
    const article = document.createElement("article");
    article.className = "featured-portfolio-card";

    const head = document.createElement("div");
    head.className = "featured-profile-head";

    const avatar = document.createElement("span");
    avatar.className = "featured-profile-avatar";

    if (profile.image_path) {
      const image = document.createElement("img");
      image.src = getProfileImageURL(profile.image_path);
      image.alt = `${profile.display_name || profile.username} profile picture`;
      image.loading = "lazy";
      image.addEventListener("error", () => {
        image.remove();
        avatar.textContent = getProfileInitials(profile.display_name || profile.username);
      }, { once: true });
      avatar.appendChild(image);
    }
    else {
      avatar.textContent = getProfileInitials(profile.display_name || profile.username);
    }

    const identity = document.createElement("div");
    identity.className = "featured-profile-identity";

    const name = document.createElement("strong");
    name.textContent = profile.display_name || profile.username;

    const username = document.createElement("span");
    username.textContent = `@${profile.username}`;

    identity.append(name, username);
    head.append(avatar, identity);

    const specialty = document.createElement("span");
    specialty.className = "featured-specialty";
    specialty.textContent = PROFILE_SPECIALTIES[profile.specialty] || "Technology";

    const technologies = document.createElement("div");
    technologies.className = "featured-tech-list";
    (Array.isArray(profile.tech_stack) ? profile.tech_stack.slice(0, 3) : [])
      .forEach(technology => {
        const chip = document.createElement("span");
        chip.textContent = technology;
        technologies.appendChild(chip);
      });

    const link = document.createElement("a");
    link.className = "featured-view-link";
    link.href = buildPortfolioURL(profile.username);
    link.append("View Portfolio");

    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    link.appendChild(arrow);

    article.append(head, specialty, technologies, link);
    return article;
  }


  async function loadFeaturedPortfolios() {
    const container = document.getElementById("featuredPortfolioGrid");
    const message = document.getElementById("featuredPortfolioMessage");
    if (!container || !message) return;

    const requestId = ++featuredPortfolioRequestId;
    message.textContent = "Loading featured portfolios...";

    const { data, error } = await supabaseClient
      .from("profiles")
      .select("user_id, username, display_name, image_path, specialty, tech_stack, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (requestId !== featuredPortfolioRequestId) return;

    container.innerHTML = "";

    if (error) {
      console.error("Featured portfolios loading error:", error);
      message.textContent = "Could not load featured portfolios right now.";
      return;
    }

    (data || []).forEach(profile =>
      container.appendChild(createFeaturedPortfolioCard(profile))
    );

    message.textContent = data?.length
      ? ""
      : "No public portfolios are available yet.";

    initializeLandingRevealAnimations();
  }


  async function loadPublicUserDirectory(
    searchValue = ""
  ) {

    const container =
      document.getElementById(
        "userSearchResults"
      );


    const message =
      document.getElementById(
        "userSearchMessage"
      );


    if (!container || !message) {
      return;
    }


    const requestId =
      ++userSearchRequestId;


    const term =
      String(searchValue || "")
        .trim()
        .slice(0, 80);


    const specialty =
      document.getElementById(
        "userSpecialtyFilter"
      )?.value || "";


    const technology =
      document.getElementById(
        "userTechFilter"
      )?.value || "";


    const sortMode =
      document.getElementById(
        "userSortFilter"
      )?.value || "newest";


    message.textContent =
      term || specialty || technology
        ? "Searching..."
        : "Loading public portfolios...";


    try {
      let profiles = [];


      const applyDirectoryFilters = query => {
        let filteredQuery = query
          .eq("is_public", true);


        if (specialty) {
          filteredQuery =
            filteredQuery.eq(
              "specialty",
              specialty
            );
        }


        if (technology) {
          filteredQuery =
            filteredQuery.contains(
              "tech_stack",
              [technology]
            );
        }


        return filteredQuery;
      };


      if (!term) {
        const { data, error } =
          await applyDirectoryFilters(
            supabaseClient
              .from("profiles")
              .select(
                "user_id, username, display_name, image_path, specialty, tech_stack, created_at"
              )
          )
            .order(
              "created_at",
              { ascending: false }
            )
            .limit(48);


        if (error) {
          throw error;
        }


        profiles = data || [];
      }

      else {
        const pattern = `%${term}%`;


        const [
          usernameResult,
          displayNameResult
        ] = await Promise.all([
          applyDirectoryFilters(
            supabaseClient
              .from("profiles")
              .select(
                "user_id, username, display_name, image_path, specialty, tech_stack, created_at"
              )
          )
            .ilike("username", pattern)
            .limit(48),

          applyDirectoryFilters(
            supabaseClient
              .from("profiles")
              .select(
                "user_id, username, display_name, image_path, specialty, tech_stack, created_at"
              )
          )
            .ilike(
              "display_name",
              pattern
            )
            .limit(48)
        ]);


        if (usernameResult.error) {
          throw usernameResult.error;
        }


        if (displayNameResult.error) {
          throw displayNameResult.error;
        }


        const uniqueProfiles =
          new Map();


        [
          ...(usernameResult.data || []),
          ...(displayNameResult.data || [])
        ].forEach(profile => {
          uniqueProfiles.set(
            profile.user_id,
            profile
          );
        });


        profiles =
          [...uniqueProfiles.values()]
            .slice(0, 48);
      }


      profiles = (
        await sortPublicProfiles(
          profiles,
          sortMode
        )
      ).slice(0, 12);


      if (requestId !== userSearchRequestId) {
        return;
      }


      renderPublicUserCards(profiles);

      message.textContent =
        profiles.length
          ? ""
          : term || specialty || technology
            ? "No public portfolio matches your search."
            : "No public portfolios are available yet.";
    }

    catch (error) {
      console.error(
        "Public user search error:",
        error
      );


      if (requestId !== userSearchRequestId) {
        return;
      }


      container.innerHTML = "";
      message.textContent =
        "Could not load public portfolios right now.";
    }
  }


  function openDashboard() {

    if (!currentUser) {
      showAuthScreen(
        "login",
        "Login to open your dashboard."
      );

      return;
    }


    if (!signedInProfile) {
      showOnboarding();

      return;
    }


    const url =
      getBasePageURL();


    url.searchParams.set(
      "view",
      "dashboard"
    );


    window.location.href = url.href;
  }


  function viewMyPortfolio() {

    if (!signedInProfile) {
      showOnboarding();
      return;
    }


    window.location.href =
      buildPortfolioURL(
        signedInProfile.username
      );
  }


  async function copyText(value) {

    if (
      navigator.clipboard
      &&
      window.isSecureContext
    ) {
      await navigator.clipboard
        .writeText(value);

      return true;
    }


    const temporaryInput =
      document.createElement(
        "textarea"
      );


    temporaryInput.value = value;
    temporaryInput.readOnly = true;
    temporaryInput.style.position =
      "fixed";
    temporaryInput.style.opacity =
      "0";


    document.body.appendChild(
      temporaryInput
    );


    temporaryInput.select();


    const copied =
      document.execCommand("copy");


    temporaryInput.remove();


    return copied;
  }


  async function copyMyPortfolioLink(
    button
  ) {

    if (!signedInProfile) {
      return;
    }


    const originalText =
      button?.textContent || "";


    try {

      const copied =
        await copyText(
          buildPortfolioURL(
            signedInProfile.username
          )
        );


      if (button) {
        button.textContent =
          copied
            ? "✓ Link Copied"
            : "Copy Failed";
      }

    }

    catch (error) {

      console.error(
        "Portfolio link copy error:",
        error
      );


      if (button) {
        button.textContent =
          "Copy Failed";
      }
    }


    if (button) {
      window.setTimeout(
        () => {
          button.textContent =
            originalText;
        },
        1800
      );
    }
  }


  function openSharePortfolioModal() {
    if (!currentUser || !signedInProfile || !isAdmin) {
      return;
    }

    const modal = document.getElementById("sharePortfolioModal");
    const input = document.getElementById("sharePortfolioUrl");
    const message = document.getElementById("sharePortfolioMessage");
    const portfolioURL = buildPortfolioURL(signedInProfile.username);

    input.value = portfolioURL;
    message.textContent = "";

    modal.style.display = "flex";
  }


  function closeSharePortfolioModal() {
    const modal = document.getElementById("sharePortfolioModal");
    if (modal) modal.style.display = "none";
  }


  async function copySharePortfolioLink(button) {
    const value = document.getElementById("sharePortfolioUrl")?.value || "";
    const message = document.getElementById("sharePortfolioMessage");
    if (!value || !button) return;

    const originalText = button.textContent;

    try {
      const copied = await copyText(value);
      button.textContent = copied ? "✓ Copied" : "Copy Failed";
      message.textContent = copied ? "Portfolio link copied successfully." : "Could not copy the link.";
      message.classList.toggle("success", copied);
    }
    catch {
      button.textContent = "Copy Failed";
      message.textContent = "Could not copy the link.";
      message.classList.remove("success");
    }

    window.setTimeout(() => {
      button.textContent = originalText;
    }, 1800);
  }


  function handleLandingPrimaryAction() {

    if (!currentUser) {
      showAuthScreen("signup");
      return;
    }


    if (!signedInProfile) {
      showOnboarding();
      return;
    }


    openDashboard();
  }


  function updateLandingForSession() {

    const primaryButtons = [
      document.getElementById(
        "landingPrimaryAction"
      ),
      document.getElementById(
        "landingHeroPrimaryAction"
      )
    ];


    const secondaryButtons = [
      document.getElementById(
        "landingSecondaryAction"
      ),
      document.getElementById(
        "landingHeroSecondaryAction"
      )
    ];


    primaryButtons.forEach(
      button => {

        if (!button) {
          return;
        }


        button.textContent =
          !currentUser
            ? "Create Your Portfolio"
            :
            !signedInProfile
              ? "Complete Your Portfolio"
              : "Open Dashboard";


        button.onclick =
          handleLandingPrimaryAction;
      }
    );


    secondaryButtons.forEach(
      button => {

        if (!button) {
          return;
        }


        button.textContent =
          signedInProfile
            ? "View My Portfolio"
            : "Login";


        button.onclick =
          signedInProfile
            ? viewMyPortfolio
            : () =>
              showAuthScreen("login");
      }
    );
  }


  function setAuthMessage(
    text,
    success = false
  ) {

    const message =
      document.getElementById(
        "authMessage"
      );


    message.textContent = text || "";
    message.classList.toggle(
      "success",
      success
    );
  }


  function selectAuthMode(mode) {

    const supportedModes = [
      "login",
      "signup",
      "forgot",
      "reset"
    ];


    authMode = supportedModes.includes(mode)
      ? mode
      : "login";


    const isSignup =
      authMode === "signup";


    const isLogin =
      authMode === "login";


    const isForgot =
      authMode === "forgot";


    const isReset =
      authMode === "reset";


    document.getElementById(
      "loginForm"
    ).hidden = !isLogin;


    document.getElementById(
      "signupForm"
    ).hidden = !isSignup;


    document.getElementById(
      "forgotPasswordForm"
    ).hidden = !isForgot;


    document.getElementById(
      "resetPasswordForm"
    ).hidden = !isReset;


    document.getElementById(
      "authTabs"
    ).hidden = isForgot || isReset;


    document.getElementById(
      "loginTab"
    ).classList.toggle(
      "active",
      isLogin
    );


    document.getElementById(
      "signupTab"
    ).classList.toggle(
      "active",
      isSignup
    );


    const authIsArabic =
      getCurrentLanguage() === "ar";


    document.getElementById(
      "authHeading"
    ).textContent = {
      login:
        authIsArabic ? "مرحبًا بعودتك" : "Welcome Back",
      signup:
        authIsArabic ? "أنشئ حسابك" : "Create Your Account",
      forgot:
        authIsArabic ? "استعادة كلمة المرور" : "Reset Your Password",
      reset:
        authIsArabic ? "اختر كلمة مرور جديدة" : "Choose a New Password"
    }[authMode];


    document.getElementById(
      "authDescription"
    ).textContent = {
      login:
        authIsArabic
          ?
          "سجل الدخول لإدارة بورتفوليو المطور الخاص بك."
          :
          "Login to manage your developer portfolio.",
      signup:
        authIsArabic
          ?
          "ابدأ بناء بورتفوليو المطور العام الخاص بك."
          :
          "Start building your public developer portfolio.",
      forgot:
        authIsArabic
          ?
          "أدخل بريد حسابك وسنرسل لك رابط استعادة آمنًا."
          :
          "Enter your account email and we will send you a secure reset link.",
      reset:
        authIsArabic
          ?
          "أدخل كلمة المرور الجديدة وأكدها لحسابك."
          :
          "Enter and confirm the new password for your account."
    }[authMode];


    setAuthMessage("");
  }


  function showAuthScreen(
    mode = "login",
    message = ""
  ) {

    showAppView("auth");

    setPrivateViewMetadata({
      signup: "Create Account",
      forgot: "Reset Password",
      reset: "Choose New Password",
      login: "Login"
    }[mode] || "Login");

    selectAuthMode(mode);

    setAuthMessage(message);


    window.setTimeout(
      () => {

        const focusTargets = {
          login: "loginEmail",
          signup: "signupEmail",
          forgot: "forgotPasswordEmail",
          reset: "resetPassword"
        };


        document.getElementById(
          focusTargets[authMode]
        )?.focus();

      },
      50
    );
  }


  function getFriendlyAuthError(error) {

    const message =
      String(error?.message || "")
        .toLowerCase();


    if (
      message.includes(
        "invalid login credentials"
      )
    ) {
      return "Email or password is incorrect.";
    }


    if (
      message.includes(
        "email not confirmed"
      )
    ) {
      return "Confirm your email first, then login.";
    }


    if (
      message.includes(
        "user already registered"
      )
    ) {
      return "This email already has an account. Try Login.";
    }


    if (
      message.includes("password")
      &&
      message.includes("characters")
    ) {
      return "Password does not meet the required length.";
    }


    if (message.includes("rate limit")) {
      return "Too many attempts. Wait a moment and try again.";
    }


    return error?.message
      ||
      "Authentication failed. Please try again.";
  }


  async function loadSignedInState(user) {

    currentUser = user || null;
    signedInProfile = null;
    isPlatformAdmin = false;


    if (!currentUser) {
      return;
    }

    const loadingUserId = currentUser.id;

    const [profileResult, adminResult] =
      await Promise.all([
        supabaseClient
          .from("profiles")
          .select("*")
          .eq(
            "user_id",
            currentUser.id
          )
          .maybeSingle(),

        supabaseClient
          .rpc("is_admin")
      ]);


    if (currentUser?.id !== loadingUserId) return;

    if (profileResult.error) {
      console.error(
        "Signed-in profile loading error:",
        profileResult.error
      );
    }


    signedInProfile =
      profileResult.data || null;


    isPlatformAdmin =
      !adminResult.error && adminResult.data === true;
    syncAccountControls();
    loadNotifications(true);
  }


  async function checkExistingAdminSession() {

    const { data, error } =
      await supabaseClient.auth
        .getSession();


    if (error) {
      console.error(
        "Session loading error:",
        error
      );
    }


    await loadSignedInState(
      data?.session?.user || null
    );
  }


  async function performLogin(
    email,
    password
  ) {

    const { data, error } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });


    if (error) {
      throw error;
    }


    await loadSignedInState(
      data.user
    );
  }


  async function handleLogin(event) {

    event?.preventDefault();


    const email =
      document.getElementById(
        "loginEmail"
      ).value.trim();


    const password =
      document.getElementById(
        "loginPassword"
      ).value;


    const button =
      document.getElementById(
        "loginSubmitButton"
      );


    button.disabled = true;
    button.textContent = "Logging in...";
    setAuthMessage("");


    try {

      await performLogin(
        email,
        password
      );


      if (!signedInProfile) {
        showOnboarding();
      }

      else {
        openDashboard();
      }

    }

    catch (error) {

      setAuthMessage(
        getFriendlyAuthError(error)
      );

    }

    finally {

      button.disabled = false;
      button.textContent = "Login";

    }
  }


  function showForgotPassword() {

    const loginEmail =
      document.getElementById(
        "loginEmail"
      ).value.trim();


    document.getElementById(
      "forgotPasswordEmail"
    ).value = loginEmail;


    showAuthScreen("forgot");
  }


  function getPasswordResetRedirectURL() {

    const redirectURL =
      new URL(
        PUBLIC_SITE_URL
      );


    redirectURL.search = "";
    redirectURL.hash = "";


    redirectURL.searchParams.set(
      "view",
      "reset-password"
    );


    return redirectURL.toString();
  }


  async function handleForgotPassword(
    event
  ) {

    event.preventDefault();


    const email =
      document.getElementById(
        "forgotPasswordEmail"
      ).value.trim();


    const button =
      document.getElementById(
        "forgotPasswordSubmitButton"
      );


    button.disabled = true;
    button.textContent =
      "Sending link...";


    setAuthMessage("");


    try {

      const { error } =
        await supabaseClient.auth
          .resetPasswordForEmail(
            email,
            {
              redirectTo:
                getPasswordResetRedirectURL()
            }
          );


      if (error) {
        throw error;
      }


      setAuthMessage(
        "If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.",
        true
      );

    }

    catch (error) {

      setAuthMessage(
        getFriendlyAuthError(error)
      );

    }

    finally {

      button.disabled = false;
      button.textContent =
        "Send Reset Link";

    }
  }


  function showPasswordReset(
    message = ""
  ) {

    showAuthScreen(
      "reset",
      message
    );
  }


  async function handlePasswordUpdate(
    event
  ) {

    event.preventDefault();


    const password =
      document.getElementById(
        "resetPassword"
      ).value;


    const passwordConfirm =
      document.getElementById(
        "resetPasswordConfirm"
      ).value;


    if (password.length < 6) {
      setAuthMessage(
        "Password must be at least 6 characters."
      );

      return;
    }


    if (password !== passwordConfirm) {
      setAuthMessage(
        "Passwords do not match."
      );

      return;
    }


    const { data: sessionData } =
      await supabaseClient.auth
        .getSession();


    if (!sessionData?.session) {
      setAuthMessage(
        "This reset link is invalid or has expired. Request a new link."
      );

      return;
    }


    const button =
      document.getElementById(
        "resetPasswordSubmitButton"
      );


    button.disabled = true;
    button.textContent =
      "Updating password...";


    setAuthMessage("");


    try {

      const { error } =
        await supabaseClient.auth
          .updateUser({
            password
          });


      if (error) {
        throw error;
      }


      await supabaseClient.auth
        .signOut();


      currentUser = null;
      signedInProfile = null;
      isPlatformAdmin = false;
      isAdmin = false;


      document.getElementById(
        "resetPasswordForm"
      ).reset();


      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?view=login`
      );


      showAuthScreen(
        "login",
        "Password updated successfully. Login with your new password."
      );


      document.getElementById(
        "authMessage"
      ).classList.add("success");

    }

    catch (error) {

      setAuthMessage(
        getFriendlyAuthError(error)
      );

    }

    finally {

      button.disabled = false;
      button.textContent =
        "Update Password";

    }
  }


  async function handleSignup(event) {

    event?.preventDefault();


    const email =
      document.getElementById(
        "signupEmail"
      ).value.trim();


    const password =
      document.getElementById(
        "signupPassword"
      ).value;


    const passwordConfirm =
      document.getElementById(
        "signupPasswordConfirm"
      ).value;


    if (password !== passwordConfirm) {
      setAuthMessage(
        "Passwords do not match."
      );

      return;
    }


    if (password.length < 6) {
      setAuthMessage(
        "Password must be at least 6 characters."
      );

      return;
    }


    const button =
      document.getElementById(
        "signupSubmitButton"
      );


    button.disabled = true;
    button.textContent =
      "Creating account...";
    setAuthMessage("");


    try {

      const { data, error } =
        await supabaseClient.auth
          .signUp({
            email,
            password,
            options: {
              emailRedirectTo:
                `${PUBLIC_SITE_URL}?view=onboarding`
            }
          });


      if (error) {
        throw error;
      }


      if (!data.session) {
        selectAuthMode("login");

        setAuthMessage(
          "Account created. Confirm your email, then login to complete your portfolio.",
          true
        );

        document.getElementById(
          "loginEmail"
        ).value = email;

        return;
      }


      await loadSignedInState(
        data.user
      );


      showOnboarding();

    }

    catch (error) {

      setAuthMessage(
        getFriendlyAuthError(error)
      );

    }

    finally {

      button.disabled = false;
      button.textContent =
        "Create Account";

    }
  }


  function showOnboarding() {

    if (!currentUser) {
      showAuthScreen("login");
      return;
    }


    showAppView("onboarding");

    setPrivateViewMetadata(
      "Create Your Portfolio"
    );


    const emailName =
      String(currentUser.email || "")
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 30);


    const usernameInput =
      document.getElementById(
        "onboardingUsername"
      );


    if (
      !usernameInput.value
      &&
      USERNAME_PATTERN.test(emailName)
    ) {
      usernameInput.value = emailName;
    }


    syncOnboardingTechStack();
    renderOnboardingTechPicker(
      document.getElementById(
        "onboardingTechSearch"
      )?.value || ""
    );


    initializeOnboardingLivePreview();
    updateOnboardingLivePreview();


    document.getElementById(
      "onboardingMessage"
    ).textContent = "";
  }


  function updateOnboardingPreviewImage() {
    const avatar = document.getElementById("onboardingPreviewAvatar");
    const file = document.getElementById("onboardingImage")?.files?.[0];
    if (!avatar) return;

    if (onboardingPreviewImageUrl) {
      URL.revokeObjectURL(onboardingPreviewImageUrl);
      onboardingPreviewImageUrl = "";
    }

    avatar.innerHTML = "";

    if (file && !validateProfileImageFile(file)) {
      onboardingPreviewImageUrl = URL.createObjectURL(file);
      const image = document.createElement("img");
      image.src = onboardingPreviewImageUrl;
      image.alt = "Selected profile preview";
      avatar.appendChild(image);
      return;
    }

    const displayName =
      document.getElementById("onboardingDisplayName")?.value.trim()
      || "Your Name";
    avatar.textContent = getProfileInitials(displayName);
  }


  function updateOnboardingLivePreview() {
    const username =
      document.getElementById("onboardingUsername")?.value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 30)
      || "yourname";

    const displayName =
      document.getElementById("onboardingDisplayName")?.value.trim()
      || "Your Name";

    const bio =
      document.getElementById("onboardingBio")?.value.trim()
      || "Your short bio will appear here as you type.";

    const specialty =
      document.getElementById("onboardingSpecialty")?.value || "";

    document.getElementById("onboardingPreviewPath").textContent =
      `~/${username}/README.md`;
    document.getElementById("onboardingPreviewName").textContent = displayName;
    document.getElementById("onboardingPreviewUsername").textContent = `@${username}`;
    document.getElementById("onboardingPreviewSpecialty").textContent =
      PROFILE_SPECIALTIES[specialty] || "Your specialty";
    document.getElementById("onboardingPreviewBio").textContent = bio;

    const avatar = document.getElementById("onboardingPreviewAvatar");
    if (avatar && !avatar.querySelector("img")) {
      avatar.textContent = getProfileInitials(displayName);
    }

    const socials = document.getElementById("onboardingPreviewSocials");
    socials.innerHTML = "";

    const socialValues = [
      ["GitHub", document.getElementById("onboardingGithub")?.value.trim()],
      ["LinkedIn", document.getElementById("onboardingLinkedin")?.value.trim()]
    ];

    socialValues.forEach(([label, value]) => {
      if (!value) return;
      const chip = document.createElement("span");
      chip.textContent = label;
      socials.appendChild(chip);
    });

    const technologies = document.getElementById("onboardingPreviewTech");
    technologies.innerHTML = "";

    const previewTechnologies = selectedOnboardingTechnologies.slice(0, 8);
    if (!previewTechnologies.length) {
      const empty = document.createElement("span");
      empty.textContent = "Your Tech Stack";
      technologies.appendChild(empty);
    }
    else {
      previewTechnologies.forEach(technology => {
        const chip = document.createElement("span");
        chip.textContent = technology;
        technologies.appendChild(chip);
      });
    }
  }


  function initializeOnboardingLivePreview() {
    const fieldIds = [
      "onboardingUsername",
      "onboardingDisplayName",
      "onboardingBio",
      "onboardingSpecialty",
      "onboardingGithub",
      "onboardingLinkedin"
    ];

    fieldIds.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (!field || field.dataset.previewBound === "true") return;
      field.dataset.previewBound = "true";
      field.addEventListener("input", updateOnboardingLivePreview);
      field.addEventListener("change", updateOnboardingLivePreview);
    });

    const imageInput = document.getElementById("onboardingImage");
    if (imageInput && imageInput.dataset.previewBound !== "true") {
      imageInput.dataset.previewBound = "true";
      imageInput.addEventListener("change", () => {
        updateOnboardingPreviewImage();
        updateOnboardingLivePreview();
      });
    }
  }


  function validateProfileImageFile(file) {

    if (!file) {
      return "";
    }


    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];


    if (!allowedTypes.includes(file.type)) {
      return "Use PNG, JPG or WebP for the profile image.";
    }


    if (file.size > 2 * 1024 * 1024) {
      return "Profile image must be under 2 MB.";
    }


    return "";
  }


  async function completeOnboarding(event) {

    event.preventDefault();


    if (!currentUser) {
      showAuthScreen("login");
      return;
    }


    const username =
      document.getElementById(
        "onboardingUsername"
      ).value.trim().toLowerCase();


    const displayName =
      document.getElementById(
        "onboardingDisplayName"
      ).value.trim();


    const bio =
      document.getElementById(
        "onboardingBio"
      ).value.trim();


    const specialty =
      document.getElementById(
        "onboardingSpecialty"
      ).value;


    const githubInput =
      document.getElementById(
        "onboardingGithub"
      ).value.trim();


    const linkedinInput =
      document.getElementById(
        "onboardingLinkedin"
      ).value.trim();


    const techStack =
      selectedOnboardingTechnologies
        .map(item =>
          String(item || "").trim()
        )
        .filter(Boolean)
        .slice(0, 30);


    const imageFile =
      document.getElementById(
        "onboardingImage"
      ).files[0];


    const message =
      document.getElementById(
        "onboardingMessage"
      );


    if (!USERNAME_PATTERN.test(username)) {
      message.textContent =
        "Username must be 3–30 characters using English letters, numbers, _ or - only.";

      return;
    }


    if (!displayName || !bio) {
      message.textContent =
        "Display Name and Short Bio are required.";

      return;
    }


    if (!PROFILE_SPECIALTIES[specialty]) {
      message.textContent =
        "Choose a valid specialty.";

      return;
    }


    if (!techStack.length) {
      message.textContent =
        "Choose at least one technology for your Tech Stack.";

      return;
    }


    const githubURL =
      githubInput
        ? safeHttpUrl(githubInput)
        : "";


    const linkedinURL =
      linkedinInput
        ? safeHttpUrl(linkedinInput)
        : "";


    const githubUsername =
      extractGitHubUsername(
        githubURL
      );


    if (githubInput && !githubURL) {
      message.textContent =
        "Enter a valid GitHub http or https link.";

      return;
    }


    if (linkedinInput && !linkedinURL) {
      message.textContent =
        "Enter a valid LinkedIn http or https link.";

      return;
    }


    const imageError =
      validateProfileImageFile(
        imageFile
      );


    if (imageError) {
      message.textContent = imageError;
      return;
    }


    const button =
      document.getElementById(
        "onboardingSubmitButton"
      );


    button.disabled = true;
    button.textContent =
      "Creating portfolio...";
    message.textContent = "";


    let uploadedImagePath = null;


    try {

      const { data: existingProfile } =
        await supabaseClient
          .from("profiles")
          .select("user_id")
          .eq("username", username)
          .maybeSingle();


      if (existingProfile) {
        throw new Error(
          "USERNAME_TAKEN"
        );
      }


      if (imageFile) {

        const safeFileName =
          imageFile.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );


        uploadedImagePath =
          `users/${currentUser.id}/profile/`
          +
          `${Date.now()}-${generateId()}-${safeFileName}`;


        const { error: uploadError } =
          await supabaseClient.storage
            .from("portfolio-files")
            .upload(
              uploadedImagePath,
              imageFile,
              {
                contentType: imageFile.type,
                upsert: false
              }
            );


        if (uploadError) {
          throw uploadError;
        }
      }


      const { data, error } =
        await supabaseClient
          .from("profiles")
          .insert({
            user_id: currentUser.id,
            username,
            display_name: displayName,
            bio,
            specialty,
            image_path:
              uploadedImagePath,
            terminal_title:
              `~/${username}/README.md`,
            github_url:
              githubURL || null,
            linkedin_url:
              linkedinURL || null,
            public_email: null,
            social_links:
              {
                ...(githubURL
                  ? { github: githubURL }
                  : {}),
                ...(linkedinURL
                  ? { linkedin: linkedinURL }
                  : {})
              },
            github_username:
              githubUsername || null,
            primary_link_key:
              githubURL
                ? "github"
                : linkedinURL
                  ? "linkedin"
                  : null,
            section_order:
              DEFAULT_SECTION_ORDER,
            tech_stack:
              techStack,
            is_public: true
          })
          .select("*")
          .single();


      if (error) {
        throw error;
      }


      signedInProfile = data;

      openDashboard();

    }

    catch (error) {

      if (uploadedImagePath) {
        await supabaseClient.storage
          .from("portfolio-files")
          .remove([uploadedImagePath]);
      }


      const duplicateUsername =
        error?.code === "23505"
        ||
        error?.message ===
          "USERNAME_TAKEN"
        ||
        String(error?.message || "")
          .toLowerCase()
          .includes("username");


      message.textContent =
        duplicateUsername
          ? "This username is already taken. Choose another one."
          :
          error?.message
          ||
          "Could not create your portfolio.";

    }

    finally {

      button.disabled = false;
      button.textContent =
        "Open Dashboard";

    }
  }


  async function handleLogout() {

    await supabaseClient.auth.signOut();

    currentUser = null;
    signedInProfile = null;
    activePortfolioUserId = null;
    activePortfolioUsername = "";
    isPlatformAdmin = false;
    isAdmin = false;
    selectedOnboardingTechnologies = [];

    navigateToLanding();
  }


  function openAdminLogin() {
    showAuthScreen("login");
  }


  function closeAdminLogin() {

    const modal =
      document.getElementById(
        "adminLoginModal"
      );


    if (modal) {
      modal.style.display = "none";
    }
  }


  async function adminLogin() {

    const email =
      document.getElementById(
        "adminEmail"
      ).value.trim();


    const password =
      document.getElementById(
        "adminPassword"
      ).value;


    const message =
      document.getElementById(
        "adminLoginMessage"
      );


    message.textContent =
      "Logging in...";


    try {
      await performLogin(email, password);
      closeAdminLogin();
      openDashboard();
    }

    catch (error) {
      message.textContent =
        getFriendlyAuthError(error);
    }
  }


  async function adminLogout() {
    await handleLogout();
  }


  function updateAdminInterface() {
    syncAccountControls();

    const loginButton =
      document.getElementById(
        "adminLoginButton"
      );


    const logoutButton =
      document.getElementById(
        "adminLogoutButton"
      );


    const dashboardButton =
      document.getElementById(
        "dashboardButton"
      );


    if (loginButton) {
      loginButton.style.display =
        currentUser
          ? "none"
          : "block";
    }


    if (logoutButton) {
      logoutButton.style.display =
        currentUser
          ? "block"
          : "none";
    }


    if (dashboardButton) {
      dashboardButton.style.display =
        currentUser && signedInProfile
          ? "block"
          : "none";
    }


    const dashboardBar =
      document.getElementById(
        "dashboardBar"
      );


    if (dashboardBar) {
      dashboardBar.hidden = !isAdmin;
    }


    document.body.classList.toggle(
      "admin-mode",
      isAdmin
    );
  }
  /* =========================================
     HELPERS
  ========================================= */

  function escapeHTML(value) {

    const div =
      document.createElement("div");

    div.textContent =
      value ?? "";

    return div.innerHTML;

  }


  function generateId() {

    if (
      window.crypto &&
      typeof window.crypto.randomUUID
      === "function"
    ) {

      return window.crypto.randomUUID();

    }

    return (
      Date.now().toString()
      +
      Math.random()
        .toString(16)
        .slice(2)
    );

  }


  function safeHttpUrl(value) {

    if (!value) {
      return "";
    }

    try {

      const url =
        new URL(value);

      if (
        url.protocol === "http:"
        ||
        url.protocol === "https:"
      ) {

        return url.href;

      }

      return "";

    }

    catch {

      return "";

    }

  }


  function safePublicEmail(value) {

    const email =
      String(value || "").trim();


    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      .test(email)
        ? email
        : "";

  }


  function getProfileInitials(
    displayName
  ) {

    const words =
      String(displayName || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    const initials =
      words
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase();


    return initials || "DEV";
  }


  const PROFILE_SOCIAL_PLATFORMS = [
    {
      key: "github",
      label: "GitHub",
      icon: "github",
      inputId: "profileGithubInput",
      legacyField: "github_url",
      type: "url"
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: "linkedin",
      inputId: "profileLinkedinInput",
      legacyField: "linkedin_url",
      type: "url"
    },
    {
      key: "x",
      label: "X",
      icon: "x",
      inputId: "profileXInput",
      type: "url"
    },
    {
      key: "instagram",
      label: "Instagram",
      icon: "instagram",
      inputId: "profileInstagramInput",
      type: "url"
    },
    {
      key: "youtube",
      label: "YouTube",
      icon: "youtube",
      inputId: "profileYoutubeInput",
      type: "url"
    },
    {
      key: "discord",
      label: "Discord",
      icon: "discord",
      inputId: "profileDiscordInput",
      type: "url"
    },
    {
      key: "website",
      label: "Website",
      icon: "googlechrome",
      inputId: "profileWebsiteInput",
      type: "url"
    },
    {
      key: "email",
      label: "Email",
      icon: "maildotru",
      inputId: "profilePublicEmailInput",
      legacyField: "public_email",
      type: "email"
    }
  ];


  const PROFILE_SOCIAL_ICON_PATHS = {
    github:
      "M12 .7a11.3 11.3 0 0 0-3.57 22c.57.1.78-.25.78-.55v-2.13c-3.19.7-3.86-1.35-3.86-1.35-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.27-5.23-5.6 0-1.24.44-2.25 1.17-3.04-.12-.29-.51-1.46.11-3 0 0 .96-.31 3.12 1.16A10.8 10.8 0 0 1 12 6.85c.97 0 1.93.13 2.84.38 2.17-1.47 3.12-1.16 3.12-1.16.62 1.54.23 2.71.11 3 .73.79 1.17 1.8 1.17 3.04 0 4.34-2.69 5.3-5.25 5.59.41.36.78 1.06.78 2.14v3.31c0 .3.21.66.79.55A11.3 11.3 0 0 0 12 .7Z",
    linkedin:
      "M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z",
    x:
      "M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-6.4L6.46 22H3.34l7.25-8.29L2.94 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.73L8.4 4.05H6.55L17.8 19.84Z",
    instagram:
      "M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
    youtube:
      "M23.5 6.2a3 3 0 0 0-2.1-2.12C19.53 3.57 12 3.57 12 3.57s-7.53 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.87.51 9.4.51 9.4.51s7.53 0 9.4-.5a3 3 0 0 0 2.1-2.13A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.27 3.6-6.27 3.6Z",
    discord:
      "M20.32 4.37A19.8 19.8 0 0 0 15.44 3a13.4 13.4 0 0 0-.62 1.28 18.4 18.4 0 0 0-5.64 0A13.4 13.4 0 0 0 8.56 3a19.8 19.8 0 0 0-4.88 1.37C.6 8.94-.24 13.4.18 17.8a19.6 19.6 0 0 0 5.99 3.02c.48-.66.91-1.36 1.29-2.1-.71-.27-1.4-.6-2.05-.99.17-.13.34-.26.5-.4 3.96 1.84 8.26 1.84 12.17 0 .17.14.34.27.51.4-.65.39-1.34.72-2.05.99.38.74.81 1.44 1.29 2.1a19.6 19.6 0 0 0 5.99-3.02c.5-5.1-.85-9.51-3.5-13.43ZM8.02 15.1c-1.2 0-2.18-1.1-2.18-2.45s.96-2.45 2.18-2.45c1.23 0 2.2 1.11 2.18 2.45 0 1.35-.96 2.45-2.18 2.45Zm7.96 0c-1.2 0-2.18-1.1-2.18-2.45s.96-2.45 2.18-2.45c1.23 0 2.2 1.11 2.18 2.45 0 1.35-.95 2.45-2.18 2.45Z",
    googlechrome:
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.92 6h-3.1a7.6 7.6 0 0 0-1.12-3.24A8.05 8.05 0 0 1 18.92 8ZM12 4c.83 1.01 1.46 2.38 1.72 4h-3.44C10.54 6.38 11.17 5.01 12 4ZM9.3 4.76A7.6 7.6 0 0 0 8.18 8h-3.1A8.05 8.05 0 0 1 9.3 4.76ZM4.26 10h3.7a15 15 0 0 0 0 4h-3.7a8.1 8.1 0 0 1 0-4Zm.82 6h3.1a7.6 7.6 0 0 0 1.12 3.24A8.05 8.05 0 0 1 5.08 16ZM12 20c-.83-1.01-1.46-2.38-1.72-4h3.44c-.26 1.62-.89 2.99-1.72 4Zm2.04-6H9.96a13 13 0 0 1 0-4h4.08a13 13 0 0 1 0 4Zm.66 5.24A7.6 7.6 0 0 0 15.82 16h3.1a8.05 8.05 0 0 1-4.22 3.24ZM16.04 14a15 15 0 0 0 0-4h3.7a8.1 8.1 0 0 1 0 4h-3.7Z",
    maildotru:
      "M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"
  };


  const PROFILE_TECHNOLOGIES = [
    { name: "JavaScript", icon: "javascript", category: "Languages" },
    { name: "TypeScript", icon: "typescript", category: "Languages" },
    { name: "Python", icon: "python", category: "Languages" },
    { name: "Java", icon: "openjdk", category: "Languages" },
    { name: "C", icon: "c", category: "Languages" },
    { name: "C++", icon: "cplusplus", category: "Languages" },
    { name: "C#", icon: "csharp", category: "Languages" },
    { name: "Go", icon: "go", category: "Languages" },
    { name: "Rust", icon: "rust", category: "Languages" },
    { name: "PHP", icon: "php", category: "Languages" },
    { name: "Kotlin", icon: "kotlin", category: "Languages" },
    { name: "Bash", icon: "gnubash", category: "Languages" },
    { name: "HTML5", icon: "html5", category: "Frontend" },
    { name: "CSS3", icon: "css", category: "Frontend" },
    { name: "React", icon: "react", category: "Frontend" },
    { name: "Vue.js", icon: "vuedotjs", category: "Frontend" },
    { name: "Angular", icon: "angular", category: "Frontend" },
    { name: "Bootstrap", icon: "bootstrap", category: "Frontend" },
    { name: "Tailwind CSS", icon: "tailwindcss", category: "Frontend" },
    { name: "Node.js", icon: "nodedotjs", category: "Backend" },
    { name: "Express", icon: "express", category: "Backend" },
    { name: "Laravel", icon: "laravel", category: "Backend" },
    { name: "Django", icon: "django", category: "Backend" },
    { name: "Flask", icon: "flask", category: "Backend" },
    { name: "Spring Boot", icon: "springboot", category: "Backend" },
    { name: "PostgreSQL", icon: "postgresql", category: "Databases" },
    { name: "MySQL", icon: "mysql", category: "Databases" },
    { name: "MongoDB", icon: "mongodb", category: "Databases" },
    { name: "Redis", icon: "redis", category: "Databases" },
    { name: "Supabase", icon: "supabase", category: "Databases" },
    { name: "Firebase", icon: "firebase", category: "Databases" },
    { name: "Git", icon: "git", category: "Cloud & Tools" },
    { name: "GitHub", icon: "github", category: "Cloud & Tools" },
    { name: "Docker", icon: "docker", category: "Cloud & Tools" },
    { name: "Kubernetes", icon: "kubernetes", category: "Cloud & Tools" },
    { name: "AWS", icon: "amazonwebservices", category: "Cloud & Tools" },
    { name: "Azure", icon: "microsoftazure", category: "Cloud & Tools" },
    { name: "Google Cloud", icon: "googlecloud", category: "Cloud & Tools" },
    { name: "Cloudflare", icon: "cloudflare", category: "Cloud & Tools" },
    { name: "Vercel", icon: "vercel", category: "Cloud & Tools" },
    { name: "Linux", icon: "linux", category: "Cloud & Tools" },
    { name: "Canva", icon: "canva", category: "Cloud & Tools" },
    { name: "Kali Linux", icon: "kalilinux", category: "Cybersecurity" },
    { name: "Wireshark", icon: "wireshark", category: "Cybersecurity" },
    { name: "Burp Suite", icon: "burpsuite", category: "Cybersecurity" },
    { name: "OWASP", icon: "owasp", category: "Cybersecurity" },
    { name: "Nmap", icon: "nmap", category: "Cybersecurity" },
    { name: "Metasploit", icon: "metasploit", category: "Cybersecurity" },
    { name: "VS Code", icon: "visualstudiocode", category: "Cloud & Tools" },
    { name: "Postman", icon: "postman", category: "Cloud & Tools" },
    { name: "Figma", icon: "figma", category: "Cloud & Tools" },
    { name: "GitHub Actions", icon: "githubactions", category: "Cloud & Tools" },
    { name: "Terraform", icon: "terraform", category: "Cloud & Tools" },
    { name: "Jenkins", icon: "jenkins", category: "Cloud & Tools" },
    { name: "Grafana", icon: "grafana", category: "Cloud & Tools" }
  ];


  const LANDING_TECH_ROWS = {
    programming: [
      "JavaScript", "TypeScript", "Python", "Java", "C", "C++", "C#",
      "Go", "Rust", "PHP", "Kotlin", "HTML5", "CSS3", "React", "Vue.js",
      "Angular", "Bootstrap", "Tailwind CSS"
    ],
    backend: [
      "Node.js", "Express", "Laravel", "Django", "Flask", "Spring Boot",
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Firebase",
      "Docker", "Kubernetes", "AWS", "Azure", "Google Cloud", "Cloudflare",
      "Vercel"
    ],
    tools: [
      "Git", "GitHub", "Linux", "Kali Linux", "Bash", "VS Code", "Nmap",
      "Wireshark", "Burp Suite", "OWASP", "Metasploit", "Postman", "Figma",
      "Canva", "GitHub Actions", "Terraform", "Jenkins", "Grafana"
    ]
  };


  let landingTerminalTimers = [];


  function clearLandingTerminalTimers() {
    landingTerminalTimers.forEach(timer =>
      window.clearTimeout(timer)
    );
    landingTerminalTimers = [];
  }


  function scheduleLandingTerminalStep(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    landingTerminalTimers.push(timer);
  }


  function createLandingTechGroup(names, duplicate = false) {
    const group = document.createElement("div");
    group.className = "tech-marquee-group";


    if (duplicate) {
      group.setAttribute("aria-hidden", "true");
    }


    names.forEach(name => {
      const technology = PROFILE_TECHNOLOGIES.find(item =>
        item.name === name
      ) || { name, icon: "" };


      const chip = document.createElement("span");
      chip.className = "landing-tech-chip";
      chip.appendChild(
        createSimpleIcon(
          technology.icon,
          technology.name
        )
      );


      const label = document.createElement("span");
      label.textContent = technology.name;
      chip.appendChild(label);
      group.appendChild(chip);
    });


    return group;
  }


  function renderLandingTechMarquee() {
    document
      .querySelectorAll("[data-marquee-row]")
      .forEach(row => {
        if (row.dataset.rendered === "true") {
          return;
        }


        const names =
          LANDING_TECH_ROWS[
            row.dataset.marqueeRow
          ] || [];


        const track = document.createElement("div");
        track.className = "tech-marquee-track";
        track.append(
          createLandingTechGroup(names),
          createLandingTechGroup(names, true)
        );
        row.appendChild(track);
        row.dataset.rendered = "true";
      });
  }


  const LANDING_TERMINAL_SCRIPTS = {
    create: {
      command: "create-portfolio --username you",
      output: [
        { text: "✓ Profile created", className: "is-success" },
        { text: "✓ Projects connected", className: "is-success" },
        { text: "✓ GitHub connected", className: "is-success" },
        { text: "✓ Learning journey online", className: "is-success" },
        { text: "✓ Portfolio published", className: "is-success" },
        { text: "→ mydevfoliohub.github.io/?u=you", className: "is-url" }
      ]
    },
    deploy: {
      command: "deploy --prod",
      output: [
        { text: "✓ Build ready in 41s", className: "is-success" },
        { text: "✓ SSL active", className: "is-success" },
        { text: "✓ CDN warmed in 12 regions", className: "is-success" },
        { text: "→ mydevfoliohub.github.io/?u=you", className: "is-url" }
      ]
    },
    stats: {
      command: "portfolio --stats",
      output: [
        { text: "✓ 12 projects shipped", className: "is-success" },
        { text: "✓ 8 labs documented", className: "is-success" },
        { text: "✓ 31 learning notes", className: "is-success" },
        { text: "✓ 6-week streak", className: "is-success" }
      ]
    }
  };


  let landingTerminalTab = "create";
  let landingTerminalManualMode = false;


  function appendLandingTerminalLine(text, className) {

    const output =
      document.getElementById(
        "landingTerminalOutput"
      );

    if (!output) {
      return;
    }

    const line = document.createElement("div");

    line.className =
      "landing-terminal-output-line "
      + (className || "");

    line.textContent = text;
    output.appendChild(line);

    while (output.children.length > 30) {
      output.removeChild(output.firstChild);
    }

    window.requestAnimationFrame(() =>
      line.classList.add("is-visible")
    );
  }


  function runLandingTerminalCommand(raw) {

    const output =
      document.getElementById(
        "landingTerminalOutput"
      );

    if (!output) {
      return;
    }

    const command = String(raw || "").trim();

    appendLandingTerminalLine("$ " + command, "");

    if (!command) {
      return;
    }

    const name =
      command.toLowerCase().split(/\s+/)[0];

    const later = fn =>
      window.setTimeout(
        () => {
          if (currentAppView === "landing") {
            fn();
          }
        },
        400
      );

    if (name === "help") {
      appendLandingTerminalLine(
        "try: demo - signup - login - theme - lang - whoami - clear",
        ""
      );
      return;
    }

    if (name === "demo") {
      appendLandingTerminalLine(
        "Opening demo portfolio...",
        "is-success"
      );
      later(() => openDemoPortfolio());
      return;
    }

    if (name === "signup" || name === "create") {
      appendLandingTerminalLine(
        "Starting signup...",
        "is-success"
      );
      later(() => handleLandingPrimaryAction());
      return;
    }

    if (name === "login") {
      appendLandingTerminalLine(
        "Opening login...",
        "is-success"
      );
      later(() => showAuthScreen("login"));
      return;
    }

    if (name === "theme") {
      toggleTheme();
      appendLandingTerminalLine(
        "Theme switched.",
        "is-success"
      );
      return;
    }

    if (name === "lang" || name === "arabic") {
      toggleLanguage();
      appendLandingTerminalLine(
        "Language switched.",
        "is-success"
      );
      return;
    }

    if (name === "whoami") {
      appendLandingTerminalLine(
        "visitor — future builder",
        "is-success"
      );
      return;
    }

    if (name === "clear") {
      output.innerHTML = "";
      return;
    }

    appendLandingTerminalLine(
      `command not found: ${name} — try 'help'`,
      ""
    );
  }


  function enterLandingTerminalManualMode() {

    if (landingTerminalManualMode) {
      return;
    }

    landingTerminalManualMode = true;
    clearLandingTerminalTimers();
  }


  function initializeLandingTerminalInput() {

    const input =
      document.getElementById(
        "landingTerminalInput"
      );

    if (!input || input.dataset.wired) {
      return;
    }

    input.dataset.wired = "true";

    const terminal = input.closest(".landing-terminal");

    if (terminal && !terminal.dataset.inputWired) {
      terminal.dataset.inputWired = "true";
      terminal.addEventListener("click", () => {
        if (currentAppView === "landing") {
          input.focus({ preventScroll: true });
        }
      });
    }

    input.addEventListener(
      "focus",
      enterLandingTerminalManualMode
    );

    input.addEventListener("keydown", event => {

      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      enterLandingTerminalManualMode();
      runLandingTerminalCommand(input.value);
      input.value = "";

    });
  }


  function getLandingTerminalScript() {
    return (
      LANDING_TERMINAL_SCRIPTS[landingTerminalTab]
      ||
      LANDING_TERMINAL_SCRIPTS.create
    );
  }


  function switchLandingTerminalTab(tab) {

    if (!LANDING_TERMINAL_SCRIPTS[tab]) {
      return;
    }

    landingTerminalTab = tab;

    document
      .querySelectorAll("[data-terminal-tab]")
      .forEach(button => {
        button.setAttribute(
          "aria-selected",
          String(
            button.getAttribute("data-terminal-tab") === tab
          )
        );
      });

    startLandingTerminalAnimation();
  }


  function renderLandingTerminalStatic() {
    const command = document.getElementById("landingTerminalCommand");
    const output = document.getElementById("landingTerminalOutput");


    if (!command || !output) return;

    const script = getLandingTerminalScript();

    command.textContent = script.command;
    output.innerHTML = "";


    script.output.forEach(lineData => {
      const line = document.createElement("div");
      line.className =
        "landing-terminal-output-line is-visible "
        + lineData.className;
      line.textContent = lineData.text;
      output.appendChild(line);
    });
  }


  function startLandingTerminalAnimation() {
    clearLandingTerminalTimers();
    landingTerminalManualMode = false;


    const command = document.getElementById("landingTerminalCommand");
    const output = document.getElementById("landingTerminalOutput");


    if (!command || !output) return;


    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


    if (reduceMotion) {
      renderLandingTerminalStatic();
      return;
    }


    const script = getLandingTerminalScript();
    const commandText = script.command;
    const outputLines = script.output;


    command.textContent = "";
    output.innerHTML = "";


    function revealOutputLine(index) {
      if (currentAppView !== "landing") return;


      if (index >= outputLines.length) {
        scheduleLandingTerminalStep(() => {
          if (
            currentAppView === "landing"
            &&
            !landingTerminalManualMode
          ) {
            startLandingTerminalAnimation();
          }
        }, 6500);
        return;
      }


      const lineData = outputLines[index];
      const line = document.createElement("div");
      line.className =
        `landing-terminal-output-line ${lineData.className}`;
      line.textContent = lineData.text;
      output.appendChild(line);


      window.requestAnimationFrame(() =>
        line.classList.add("is-visible")
      );


      scheduleLandingTerminalStep(
        () => revealOutputLine(index + 1),
        index === outputLines.length - 2 ? 720 : 520
      );
    }


    function typeCharacter(index) {
      if (currentAppView !== "landing") return;


      command.textContent = commandText.slice(0, index);


      if (index < commandText.length) {
        scheduleLandingTerminalStep(
          () => typeCharacter(index + 1),
          42
        );
        return;
      }


      scheduleLandingTerminalStep(
        () => revealOutputLine(0),
        480
      );
    }


    scheduleLandingTerminalStep(
      () => typeCharacter(1),
      420
    );
  }


  function initializeLandingRevealAnimations() {
    const elements = document.querySelectorAll(
      ".landing-tech-showcase, .how-it-works-section, .how-step-card, .landing-studio, .landing-updates, .release-entry, .landing-faq, .landing-final-cta, .landing-contact-section, .landing-features-section, .platform-feature-card"
    );


    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach(element =>
        element.classList.add("landing-reveal", "is-visible")
      );
      return;
    }


    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: "0px 0px -35px" });


    elements.forEach((element, index) => {
      element.classList.add("landing-reveal");
      if (
        element.classList.contains("platform-feature-card")
        || element.classList.contains("how-step-card")
        || element.classList.contains("featured-portfolio-card")
        || element.classList.contains("release-entry")
      ) {
        element.style.transitionDelay = `${(index % 5) * 55}ms`;
      }
      observer.observe(element);
    });
  }


  function setLandingStudioTone(tone) {
    if (!["emerald", "blue", "purple"].includes(tone)) return;
    const preview = document.querySelector(".landing-studio-demo");
    if (!preview) return;
    preview.dataset.previewTone = tone;
    preview.querySelectorAll(".studio-swatch").forEach(button => {
      button.setAttribute("aria-pressed", String(button.classList.contains("studio-swatch-" + tone)));
    });
  }


  function animateLandingStats() {

    const stats =
      document.querySelectorAll(
        ".landing-stats > div > strong[data-count]"
      );

    if (!stats.length) {
      return;
    }


    const reduceMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;


    stats.forEach(strong => {

      const target =
        parseFloat(
          strong.getAttribute("data-count")
        ) || 0;

      const suffix =
        strong.getAttribute("data-suffix") || "";

      if (
        reduceMotion
        ||
        !("IntersectionObserver" in window)
      ) {
        strong.textContent = target + suffix;
        return;
      }

      strong.textContent = "0" + suffix;

      const observer =
        new IntersectionObserver(entries => {

          entries.forEach(entry => {

            if (!entry.isIntersecting) {
              return;
            }

            observer.unobserve(strong);

            const duration = 1200;
            const start = window.performance.now();

            const tick = now => {

              const progress =
                Math.min(
                  (now - start) / duration,
                  1
                );

              const eased =
                1 - Math.pow(1 - progress, 3);

              strong.textContent =
                Math.round(target * eased) + suffix;

              if (progress < 1) {
                window.requestAnimationFrame(tick);
              }

            };

            window.requestAnimationFrame(tick);

          });

        }, { threshold: 0.4 });

      observer.observe(strong);

    });
  }


  function initializeLandingTilt() {

    let finePointer = false;
    let reduceMotion = false;

    try {
      finePointer =
        window.matchMedia("(pointer: fine)").matches;
      reduceMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return;
    }

    if (!finePointer || reduceMotion) {
      return;
    }

    [
      [".landing-terminal-stage", ".landing-terminal"],
      [".landing-studio-demo", ".landing-studio-window"]
    ].forEach(([stageSelector, cardSelector]) => {

      const stage = document.querySelector(stageSelector);
      const card = stage ? stage.querySelector(cardSelector) : null;

      if (!stage || !card) {
        return;
      }

      let frame = 0;

      stage.addEventListener("mousemove", event => {

        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        window.cancelAnimationFrame(frame);

        frame = window.requestAnimationFrame(() => {
          card.style.transform =
            `perspective(1000px) rotateY(${(x * 7).toFixed(2)}deg) rotateX(${(-y * 7).toFixed(2)}deg)`;
        });

      });

      stage.addEventListener("mouseleave", () => {
        window.cancelAnimationFrame(frame);
        card.style.transform = "";
      });

    });
  }


  const ANNOUNCE_STORAGE_KEY =
    "bassamAnnounceSeen";


  function dismissAnnounceBar() {

    const bar =
      document.getElementById(
        "announceBar"
      );

    if (bar) {
      bar.hidden = true;
    }

    try {
      localStorage.setItem(
        ANNOUNCE_STORAGE_KEY,
        "v2.2.0"
      );
    } catch {
      // Dismissal memory is best-effort only.
    }

  }


  function initializeAnnounceBar() {

    const bar =
      document.getElementById(
        "announceBar"
      );

    if (!bar) {
      return;
    }

    let seen = "";

    try {
      seen =
        localStorage.getItem(
          ANNOUNCE_STORAGE_KEY
        ) || "";
    } catch {
      seen = "";
    }

    bar.hidden = seen === "v2.2.0";
  }


  const STUDIO_TYPE_PHRASES = [
    "npx createfolio init",
    "git push origin main",
    "portfolio deploy --live"
  ];


  function initializeStudioTyping() {

    const text =
      document.querySelector(
        ".studio-typing-text"
      );

    const line =
      document.querySelector(
        ".studio-typing-line"
      );

    if (!text || !line) {
      return;
    }

    let reduceMotion = false;

    try {
      reduceMotion =
        window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
    } catch {
      reduceMotion = false;
    }

    if (
      reduceMotion
      ||
      !("IntersectionObserver" in window)
    ) {
      text.textContent = STUDIO_TYPE_PHRASES[0];
      return;
    }

    let phrase = 0;
    let char = 0;
    let deleting = false;
    let timer = 0;
    let visible = false;

    const step = () => {

      if (!visible) {
        return;
      }

      const current = STUDIO_TYPE_PHRASES[phrase];

      if (!deleting) {

        char += 1;
        text.textContent = current.slice(0, char);

        if (char >= current.length) {
          deleting = true;
          timer = window.setTimeout(step, 1800);
          return;
        }

        timer =
          window.setTimeout(
            step,
            55 + Math.random() * 60
          );

        return;
      }

      char -= 1;
      text.textContent = current.slice(0, char);

      if (char <= 0) {
        deleting = false;
        phrase = (phrase + 1) % STUDIO_TYPE_PHRASES.length;
        timer = window.setTimeout(step, 450);
        return;
      }

      timer = window.setTimeout(step, 28);

    };

    const observer =
      new IntersectionObserver(entries => {

        entries.forEach(entry => {

          const was = visible;
          visible = entry.isIntersecting;

          if (visible && !was) {
            window.clearTimeout(timer);
            step();
          }

          if (!visible) {
            window.clearTimeout(timer);
          }

        });

      }, { threshold: 0.3 });

    observer.observe(line);
  }


  function initializeLandingExperience() {
    renderLandingTechMarquee();
    startLandingTerminalAnimation();
    initializeLandingTerminalInput();
    initializeLandingRevealAnimations();
    animateLandingStats();
    initializeLandingTilt();
    initializeAnnounceBar();
    initializeStudioTyping();
    // This landing page introduces the builder without fetching user directories.
  }


  function populateUserTechFilter() {
    const select =
      document.getElementById(
        "userTechFilter"
      );


    if (!select || select.options.length > 1) {
      return;
    }


    PROFILE_TECHNOLOGIES.forEach(technology => {
      const option =
        document.createElement("option");


      option.value = technology.name;
      option.textContent = technology.name;
      select.appendChild(option);
    });
  }


  let selectedProfileTechnologies = [];
  let selectedOnboardingTechnologies = [];


  function createSimpleIcon(
    iconName,
    label,
    fallbackClass = "tech-icon-fallback"
  ) {

    const safeIconName =
      String(iconName || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");


    if (!safeIconName) {
      const fallback =
        document.createElement("span");

      fallback.className = fallbackClass;
      fallback.textContent =
        String(label || "?")
          .slice(0, 2)
          .toUpperCase();

      return fallback;
    }


    const image =
      document.createElement("img");


    image.src =
      `https://cdn.simpleicons.org/${safeIconName}/d8c7ff`;

    image.alt = "";
    image.loading = "lazy";
    image.setAttribute(
      "aria-hidden",
      "true"
    );


    image.addEventListener(
      "error",
      () => {
        const fallback =
          document.createElement("span");

        fallback.className =
          fallbackClass;

        fallback.textContent =
          String(label || "?")
            .slice(0, 2)
            .toUpperCase();

        image.replaceWith(fallback);
      },
      { once: true }
    );


    return image;
  }


  function createSocialIcon(platform) {

    const pathData =
      PROFILE_SOCIAL_ICON_PATHS[
        platform.icon
      ];


    if (!pathData) {
      return createSimpleIcon(
        platform.icon,
        platform.label,
        "social-icon-fallback"
      );
    }


    const namespace =
      "http://www.w3.org/2000/svg";


    const svg =
      document.createElementNS(
        namespace,
        "svg"
      );


    svg.setAttribute(
      "viewBox",
      "0 0 24 24"
    );

    svg.setAttribute(
      "aria-hidden",
      "true"
    );


    const path =
      document.createElementNS(
        namespace,
        "path"
      );


    path.setAttribute("d", pathData);
    svg.appendChild(path);


    return svg;
  }


  function getProfileSocialLinks(
    profile = {}
  ) {

    const storedLinks =
      profile.social_links
      &&
      typeof profile.social_links
        === "object"
      &&
      !Array.isArray(
        profile.social_links
      )
        ? profile.social_links
        : {};


    const links = {};


    PROFILE_SOCIAL_PLATFORMS
      .forEach(platform => {

        const rawValue =
          storedLinks[platform.key]
          ||
          (
            platform.legacyField
              ? profile[
                  platform.legacyField
                ]
              : ""
          );


        const safeValue =
          platform.type === "email"
            ? safePublicEmail(rawValue)
            : safeHttpUrl(rawValue);


        if (safeValue) {
          links[platform.key] =
            safeValue;
        }
      });


    return links;
  }


  /* CV export uses only the viewed profile and owner-scoped public content.
     Browser PDF printing preserves selectable text, Arabic shaping and links. */
  function buildPortfolioCvDocument(profile, sections) {
    const text = value => escapeHTML(String(value ?? ""));
    const paragraph = value => value ? '<p dir="auto">' + text(value).replace(/\r?\n/g, "<br>") + "</p>" : "";
    const link = (url, label) => {
      const safe = safeHttpUrl(url || "");
      return safe ? '<a dir="auto" href="' + text(safe) + '">' + text(label || safe) + "</a>" : "";
    };
    const section = (heading, rows) => rows.length
      ? "<section><h2>" + text(heading) + "</h2>" + rows.join("") + "</section>" : "";
    const date = value => {
      if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return "";
      const parsed = new Date(String(value).slice(0, 10) + "T00:00:00");
      return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString("en", {month:"short",year:"numeric"});
    };
    const entry = (title, meta, description, url) =>
      '<article><h3 dir="auto">' + text(title) + "</h3>" +
      (meta ? '<p class="meta" dir="auto">' + text(meta) + "</p>" : "") +
      paragraph(description) + (url ? '<p class="item-link">' + link(url) + "</p>" : "") + "</article>";
    const name = profile.display_name || profile.username;
    const socials = getProfileSocialLinks(profile);
    const contacts = [
      link(buildPortfolioURL(profile.username), "Portfolio: @" + profile.username),
      link(socials.github, socials.github),
      link(socials.linkedin, socials.linkedin),
      link(socials.website, socials.website)
    ].filter(Boolean);
    // getProfileSocialLinks reads public_email / explicitly public socials, never auth email.
    if (socials.email) contacts.push('<span dir="auto">' + text(socials.email) + "</span>");
    const education = sections.education.map(item => entry(
      item.institution,
      [item.degree, item.field_of_study, item.current_level,
        [date(item.start_date), date(item.graduation_date)].filter(Boolean).join(" - "),
        item.gpa ? "GPA: " + item.gpa : ""].filter(Boolean).join(" · "),
      item.description
    ));
    const work = items => items.map(item => entry(item.title,
      Array.isArray(item.tags) ? item.tags.join(" · ") : "", item.description, item.link));
    const certificates = sections.certificates.map(item =>
      entry(item.name, date(item.certificate_date), item.description || ""));
    const achievements = sections.achievements.map(item =>
      entry(item.title, date(item.badge_date), item.description));
    const skills = Array.isArray(profile.tech_stack) ? profile.tech_stack.filter(item => typeof item === "string" && item.trim()) : [];
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>" + text(name) + " - CV</title><style>" +
      '@page{size:A4;margin:17mm 18mm}*{box-sizing:border-box}html{background:#e8eaed}body{margin:24px auto;padding:18mm;max-width:210mm;background:#fff;color:#192532;font:10.5pt/1.6 Arial,Tahoma,sans-serif;overflow-wrap:anywhere}' +
      'header{border-bottom:2px solid #183d48;padding-bottom:18px;margin-bottom:22px}h1{font-size:28pt;line-height:1.18;letter-spacing:-.7px;margin:0 0 7px;color:#142d37}h2{font-size:11pt;color:#183d48;border-bottom:1px solid #ccd6dc;padding-bottom:5px;margin:22px 0 11px;text-transform:uppercase;letter-spacing:1.2px;break-after:avoid-page}h3{font-size:11pt;margin:0;color:#192532;break-after:avoid-page}p{margin:5px 0;orphans:3;widows:3}article{margin:0 0 14px}article>h3+p{break-before:avoid-page}.specialty{font-size:12pt;color:#47606b}.contacts{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:13px;font-size:9pt}.contacts>*{max-width:100%}a{color:#254c5d;text-decoration:none;overflow-wrap:anywhere}.meta{font-size:9.5pt;color:#53616c}.item-link{font-size:9pt}.skills{line-height:1.9}footer{border-top:1px solid #ccd6dc;margin-top:24px;padding-top:10px;font-size:8pt;color:#64727d}' +
      '@media(max-width:600px){body{margin:0;padding:24px;max-width:100%}h1{font-size:25pt}}@media print{html,body{background:white}body{padding:0;margin:0;max-width:none;font-size:10.5pt}a{color:inherit}header{break-inside:avoid}h1{font-size:28pt}}' +
      '</style></head><body><header><h1 dir="auto">' + text(name) + "</h1>" +
      (profile.specialty !== "other" && PROFILE_SPECIALTIES[profile.specialty] ? '<p class="specialty">' + text(PROFILE_SPECIALTIES[profile.specialty]) + "</p>" : "") +
      '<div class="contacts">' + contacts.join("") + "</div></header><main>" +
      section("Profile", profile.bio || profile.description ? [paragraph(profile.bio || profile.description)] : []) +
      section("Technical skills", skills.length ? ['<p class="skills" dir="auto">' + skills.map(text).join(" · ") + "</p>"] : []) +
      section("Education", education) + section("Projects", work(sections.projects)) +
      section("Practical labs", work(sections.labs)) + section("Certificates", certificates) +
      section("Achievements", achievements) + "</main><footer>" +
      link(buildPortfolioURL(profile.username), "Full portfolio: " + buildPortfolioURL(profile.username)) +
      "</footer></body></html>";
  }

  async function openPortfolioCv() {
    if (!currentProfile?.username || !activePortfolioUserId) return;
    const button = document.getElementById("downloadCvButton");
    if (button.disabled) return;
    const status = document.getElementById("portfolioCvStatus");
    const profile = structuredClone(currentProfile);
    const owner = activePortfolioUserId;
    button.disabled = true;
    button.textContent = "Preparing CV…";
    status.textContent = "";
    try {
      // Re-read on export so edits and failed earlier page loads cannot produce stale CV data.
      const tables = ["projects", "labs", "education_items", "certificates", "achievement_badges"];
      const results = await Promise.all(tables.map(table =>
        supabaseClient.from(table).select("*").eq("user_id", owner).order("created_at", {ascending:false})
      ));
      if (results.some(result => result.error)) throw new Error("CV_DATA_UNAVAILABLE");
      if (activePortfolioUserId !== owner || currentProfile.username !== profile.username) return;
      const byDate = (items, field) => [...items].sort((a,b) => String(b[field] || "").localeCompare(String(a[field] || "")));
      const doc = buildPortfolioCvDocument(profile, {
        projects: results[0].data || [], labs: results[1].data || [],
        education: byDate(results[2].data || [], "graduation_date"),
        certificates: byDate(results[3].data || [], "certificate_date"),
        achievements: byDate(results[4].data || [], "badge_date")
      });
      const frame = document.getElementById("portfolioCvFrame");
      const printButton = document.getElementById("printPortfolioCvButton");
      printButton.disabled = true;
      frame.onload = () => { printButton.disabled = false; };
      frame.srcdoc = doc;
      document.getElementById("portfolioCvDialog").showModal();
    }
    catch {
      status.textContent = "Could not prepare the CV. Please try again.";
    }
    finally {
      button.disabled = false;
      button.textContent = "↓ Download CV (PDF)";
    }
  }

  function printPortfolioCv() {
    const frame = document.getElementById("portfolioCvFrame");
    if (!frame?.contentWindow || document.getElementById("printPortfolioCvButton").disabled) return;
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }

  function closePortfolioCv() {
    document.getElementById("portfolioCvDialog").close();
    document.getElementById("portfolioCvFrame").srcdoc = "";
    document.getElementById("downloadCvButton").focus();
  }

  function escapeVCardValue(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  }


  function downloadContactCard() {
    if (!currentProfile?.username) {
      return;
    }


    const links =
      getProfileSocialLinks(
        currentProfile
      );


    const displayName =
      currentProfile.display_name
      || currentProfile.username;


    const rows = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${escapeVCardValue(displayName)}`,
      `N:${escapeVCardValue(displayName)};;;;`
    ];


    if (links.email) {
      rows.push(
        `EMAIL;TYPE=INTERNET:${escapeVCardValue(links.email)}`
      );
    }


    if (links.website) {
      rows.push(
        `URL;TYPE=Website:${escapeVCardValue(links.website)}`
      );
    }


    if (links.github) {
      rows.push(
        `URL;TYPE=GitHub:${escapeVCardValue(links.github)}`
      );
    }


    if (links.linkedin) {
      rows.push(
        `URL;TYPE=LinkedIn:${escapeVCardValue(links.linkedin)}`
      );
    }


    if (currentProfile.bio) {
      rows.push(
        `NOTE:${escapeVCardValue(currentProfile.bio)}`
      );
    }


    rows.push("END:VCARD");


    const blob = new Blob(
      [rows.join("\r\n")],
      { type: "text/vcard;charset=utf-8" }
    );


    const downloadURL =
      URL.createObjectURL(blob);


    const anchor =
      document.createElement("a");


    anchor.href = downloadURL;
    anchor.download =
      `${currentProfile.username}.vcf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadURL);
  }


  function renderSocialButtons(
    profile,
    containerId = "socialButtons"
  ) {

    const container =
      document.getElementById(
        containerId
      );


    if (!container) {
      return;
    }


    const links =
      getProfileSocialLinks(profile);


    container.innerHTML = "";


    PROFILE_SOCIAL_PLATFORMS
      .forEach(platform => {

        const value =
          links[platform.key];


        if (!value) {
          return;
        }


        const anchor =
          document.createElement("a");


        anchor.className =
          "social-btn";

        anchor.href =
          platform.type === "email"
            ? `mailto:${value}`
            : value;

        anchor.setAttribute(
          "aria-label",
          platform.label
        );


        if (platform.type !== "email") {
          anchor.target = "_blank";
          anchor.rel =
            "noopener noreferrer";
        }


        anchor.appendChild(
          createSocialIcon(platform)
        );


        const label =
          document.createElement("span");


        label.textContent =
          platform.label;

        anchor.appendChild(label);
        container.appendChild(anchor);
      });


    if (!container.children.length) {
      const empty =
        document.createElement("span");

      empty.className =
        "social-buttons-empty";

      empty.textContent =
        "No social links added yet.";

      container.appendChild(empty);
    }
  }


  function renderPrimaryProfileLink(
    profile,
    elementId = "primaryProfileLink"
  ) {

    const element =
      document.getElementById(
        elementId
      );


    if (!element) {
      return;
    }


    const platform =
      PROFILE_SOCIAL_PLATFORMS
        .find(item =>
          item.key ===
          profile.primary_link_key
        );


    const links =
      getProfileSocialLinks(profile);


    const value =
      platform
        ? links[platform.key]
        : "";


    if (!platform || !value) {
      element.hidden = true;
      element.removeAttribute("href");
      element.textContent = "";
      return;
    }


    element.innerHTML = "";
    element.href =
      platform.type === "email"
        ? `mailto:${value}`
        : value;

    element.hidden = false;

    element.appendChild(
      createSocialIcon(platform)
    );


    const label =
      document.createElement("span");

    label.textContent =
      platform.type === "email"
        ? "Send Me an Email"
        : `Visit My ${platform.label}`;

    element.appendChild(label);
  }


  function getTechnologyDefinition(
    technology
  ) {

    const normalized =
      String(technology || "")
        .trim()
        .toLowerCase();


    return PROFILE_TECHNOLOGIES
      .find(item =>
        item.name.toLowerCase()
        === normalized
      )
      ||
      null;
  }


  function createTechnologyChip(
    technology,
    className = "tech-display-chip"
  ) {

    const definition =
      getTechnologyDefinition(
        technology
      );


    const chip =
      document.createElement("span");


    chip.className = className;

    chip.appendChild(
      createSimpleIcon(
        definition?.icon,
        technology
      )
    );


    const label =
      document.createElement("span");


    label.textContent = technology;

    chip.appendChild(label);


    return chip;
  }


  function renderTechStackInto(
    technologies,
    containerId
  ) {

    const container =
      document.getElementById(
        containerId
      );


    if (!container) {
      return;
    }


    const values =
      Array.isArray(technologies)
        ? technologies
            .map(item =>
              String(item || "").trim()
            )
            .filter(Boolean)
        : [];


    container.innerHTML = "";


    if (values.length === 0) {
      const empty =
        document.createElement("span");

      empty.className =
        "tech-stack-empty";

      empty.textContent =
        "No technologies added yet.";

      container.appendChild(empty);
      return;
    }


    values.forEach(technology => {
      container.appendChild(
        createTechnologyChip(
          technology
        )
      );
    });
  }


  function renderTechStack(
    technologies
  ) {
    renderTechStackInto(
      technologies,
      "techStack"
    );
  }


  function syncSelectedTechStack() {

    const hiddenInput =
      document.getElementById(
        "profileTechStackInput"
      );


    if (hiddenInput) {
      hiddenInput.value =
        selectedProfileTechnologies
          .join(", ");
    }


    const count =
      document.getElementById(
        "profileTechCount"
      );


    if (count) {
      count.textContent =
        `${selectedProfileTechnologies.length} / 30`;
    }


    const selectedContainer =
      document.getElementById(
        "profileSelectedTech"
      );


    if (selectedContainer) {
      selectedContainer.innerHTML = "";


      if (
        selectedProfileTechnologies
          .length === 0
      ) {
        const empty =
          document.createElement("span");

        empty.className =
          "selected-tech-empty";

        empty.textContent =
          "Choose technologies from the list below.";

        selectedContainer
          .appendChild(empty);
      }


      selectedProfileTechnologies
        .forEach(technology => {

          const button =
            document.createElement("button");


          button.type = "button";
          button.className =
            "selected-tech-chip";

          button.title =
            `Remove ${technology}`;

          button.setAttribute(
            "aria-label",
            `Remove ${technology}`
          );


          const chip =
            createTechnologyChip(
              technology,
              "selected-tech-chip-content"
            );


          while (chip.firstChild) {
            button.appendChild(
              chip.firstChild
            );
          }


          const removeMark =
            document.createElement("b");


          removeMark.textContent = "×";
          button.appendChild(removeMark);

          button.addEventListener(
            "click",
            () => {
              toggleProfileTechnology(
                technology
              );
            }
          );


          selectedContainer
            .appendChild(button);
        });
    }


    renderTechStackInto(
      selectedProfileTechnologies,
      "profileTechPreview"
    );
  }


  function toggleProfileTechnology(
    technology
  ) {

    const existingIndex =
      selectedProfileTechnologies
        .findIndex(item =>
          item.toLowerCase()
          === technology.toLowerCase()
        );


    if (existingIndex >= 0) {
      selectedProfileTechnologies
        .splice(existingIndex, 1);
    }

    else {
      if (
        selectedProfileTechnologies
          .length >= 30
      ) {
        alert(
          "You can select up to 30 technologies."
        );
        return;
      }


      selectedProfileTechnologies
        .push(technology);
    }


    syncSelectedTechStack();


    const searchInput =
      document.getElementById(
        "profileTechSearch"
      );


    renderTechStackPicker(
      searchInput?.value || ""
    );
  }


  function renderTechStackPicker(
    searchValue = ""
  ) {

    const picker =
      document.getElementById(
        "profileTechPicker"
      );


    if (!picker) {
      return;
    }


    const query =
      String(searchValue || "")
        .trim()
        .toLowerCase();


    const matches =
      PROFILE_TECHNOLOGIES
        .filter(technology =>
          !query
          ||
          technology.name
            .toLowerCase()
            .includes(query)
          ||
          technology.category
            .toLowerCase()
            .includes(query)
        );


    picker.innerHTML = "";


    if (!matches.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "tech-picker-empty";

      empty.textContent =
        "No matching technology found.";

      picker.appendChild(empty);
      return;
    }


    const categories =
      [...new Set(
        matches.map(item =>
          item.category
        )
      )];


    categories.forEach(category => {
      const group =
        document.createElement("section");

      group.className =
        "tech-picker-category";


      const heading =
        document.createElement("h4");

      heading.textContent = category;
      group.appendChild(heading);


      const options =
        document.createElement("div");

      options.className =
        "tech-picker-options";


      matches
        .filter(item =>
          item.category === category
        )
        .forEach(technology => {

          const isSelected =
            selectedProfileTechnologies
              .some(item =>
                item.toLowerCase()
                ===
                technology.name
                  .toLowerCase()
              );


          const button =
            document.createElement("button");

          button.type = "button";
          button.className =
            "tech-picker-option"
            +
            (isSelected
              ? " is-selected"
              : "");

          button.setAttribute(
            "aria-pressed",
            String(isSelected)
          );

          button.appendChild(
            createSimpleIcon(
              technology.icon,
              technology.name
            )
          );


          const label =
            document.createElement("span");

          label.textContent =
            technology.name;

          button.appendChild(label);

          button.addEventListener(
            "click",
            () => {
              toggleProfileTechnology(
                technology.name
              );
            }
          );

          options.appendChild(button);
        });


      group.appendChild(options);
      picker.appendChild(group);
    });
  }


  function syncOnboardingTechStack() {

    const count =
      document.getElementById(
        "onboardingTechCount"
      );


    if (count) {
      count.textContent =
        `${selectedOnboardingTechnologies.length} / 30`;
    }


    const container =
      document.getElementById(
        "onboardingSelectedTech"
      );


    if (!container) {
      return;
    }


    container.innerHTML = "";


    if (
      selectedOnboardingTechnologies
        .length === 0
    ) {
      const empty =
        document.createElement("span");

      empty.className =
        "selected-tech-empty";

      empty.textContent =
        "Choose at least one technology.";

      container.appendChild(empty);
      return;
    }


    selectedOnboardingTechnologies
      .forEach(technology => {
        const button =
          document.createElement("button");

        button.type = "button";
        button.className =
          "selected-tech-chip";

        button.setAttribute(
          "aria-label",
          `Remove ${technology}`
        );


        const chip =
          createTechnologyChip(
            technology,
            "selected-tech-chip-content"
          );


        while (chip.firstChild) {
          button.appendChild(
            chip.firstChild
          );
        }


        const removeMark =
          document.createElement("b");

        removeMark.textContent = "×";
        button.appendChild(removeMark);

        button.addEventListener(
          "click",
          () => {
            toggleOnboardingTechnology(
              technology
            );
          }
        );

        container.appendChild(button);
      });
  }


  function toggleOnboardingTechnology(
    technology
  ) {

    const existingIndex =
      selectedOnboardingTechnologies
        .findIndex(item =>
          item.toLowerCase()
          === technology.toLowerCase()
        );


    if (existingIndex >= 0) {
      selectedOnboardingTechnologies
        .splice(existingIndex, 1);
    }

    else {
      if (
        selectedOnboardingTechnologies
          .length >= 30
      ) {
        alert(
          "You can select up to 30 technologies."
        );
        return;
      }


      selectedOnboardingTechnologies
        .push(technology);
    }


    syncOnboardingTechStack();


    const searchInput =
      document.getElementById(
        "onboardingTechSearch"
      );


    renderOnboardingTechPicker(
      searchInput?.value || ""
    );


    updateOnboardingLivePreview();
  }


  function renderOnboardingTechPicker(
    searchValue = ""
  ) {

    const picker =
      document.getElementById(
        "onboardingTechPicker"
      );


    if (!picker) {
      return;
    }


    const query =
      String(searchValue || "")
        .trim()
        .toLowerCase();


    const matches =
      PROFILE_TECHNOLOGIES
        .filter(technology =>
          !query
          ||
          technology.name
            .toLowerCase()
            .includes(query)
          ||
          technology.category
            .toLowerCase()
            .includes(query)
        );


    picker.innerHTML = "";


    if (!matches.length) {
      const empty =
        document.createElement("div");

      empty.className =
        "tech-picker-empty";

      empty.textContent =
        "No matching technology found.";

      picker.appendChild(empty);
      return;
    }


    const categories =
      [...new Set(
        matches.map(item =>
          item.category
        )
      )];


    categories.forEach(category => {
      const group =
        document.createElement("section");

      group.className =
        "tech-picker-category";


      const heading =
        document.createElement("h4");

      heading.textContent = category;
      group.appendChild(heading);


      const options =
        document.createElement("div");

      options.className =
        "tech-picker-options";


      matches
        .filter(item =>
          item.category === category
        )
        .forEach(technology => {
          const isSelected =
            selectedOnboardingTechnologies
              .some(item =>
                item.toLowerCase()
                ===
                technology.name
                  .toLowerCase()
              );


          const button =
            document.createElement("button");

          button.type = "button";
          button.className =
            "tech-picker-option"
            +
            (isSelected
              ? " is-selected"
              : "");

          button.setAttribute(
            "aria-pressed",
            String(isSelected)
          );

          button.appendChild(
            createSimpleIcon(
              technology.icon,
              technology.name
            )
          );


          const label =
            document.createElement("span");

          label.textContent =
            technology.name;

          button.appendChild(label);

          button.addEventListener(
            "click",
            () => {
              toggleOnboardingTechnology(
                technology.name
              );
            }
          );

          options.appendChild(button);
        });


      group.appendChild(options);
      picker.appendChild(group);
    });
  }


  function readProfileSocialEditor() {

    const links = {};


    PROFILE_SOCIAL_PLATFORMS
      .forEach(platform => {
        const input =
          document.getElementById(
            platform.inputId
          );

        links[platform.key] =
          input?.value.trim() || "";
      });


    return links;
  }


  function syncGitHubUsernameFromLink() {

    const linkInput =
      document.getElementById(
        "profileGithubInput"
      );


    const usernameInput =
      document.getElementById(
        "profileGithubUsernameInput"
      );


    if (!linkInput || !usernameInput) {
      return;
    }


    const username =
      extractGitHubUsername(
        linkInput.value
      );


    if (username) {
      usernameInput.value = username;
    }
  }


  function updateProfileReadmePreview() {

    const displayName =
      document.getElementById(
        "profileDisplayNameInput"
      )?.value.trim()
      ||
      "Developer";


    const bio =
      document.getElementById(
        "profileDescriptionInput"
      )?.value.trim()
      ||
      "Your profile description will appear here.";


    const previewName =
      document.getElementById(
        "profilePreviewDisplayName"
      );


    const previewBio =
      document.getElementById(
        "profilePreviewBio"
      );


    const previewTitle =
      document.getElementById(
        "profilePreviewReadmeTitle"
      );


    if (previewName) {
      previewName.textContent =
        displayName;
    }


    if (previewBio) {
      previewBio.textContent = bio;
    }


    if (previewTitle) {
      previewTitle.textContent =
        document.getElementById(
          "profileReadmeTitleInput"
        )?.value.trim()
        ||
        currentProfile.terminal_title
        ||
        `~/${currentProfile.username || "portfolio"}/README.md`;
    }


    const socialLinks =
      readProfileSocialEditor();


    renderSocialButtons(
      {
        social_links: socialLinks,
        github_url:
          socialLinks.github,
        linkedin_url:
          socialLinks.linkedin,
        public_email:
          socialLinks.email,
        primary_link_key:
          document.getElementById(
            "profilePrimaryLinkInput"
          )?.value || ""
      },
      "profileSocialPreview"
    );


    renderPrimaryProfileLink(
      {
        social_links: socialLinks,
        github_url:
          socialLinks.github,
        linkedin_url:
          socialLinks.linkedin,
        public_email:
          socialLinks.email,
        primary_link_key:
          document.getElementById(
            "profilePrimaryLinkInput"
          )?.value || ""
      },
      "profilePrimaryLinkPreview"
    );


    renderTechStackInto(
      selectedProfileTechnologies,
      "profileTechPreview"
    );
  }


  function setMetadataContent(
    selector,
    value
  ) {

    const element =
      document.querySelector(selector);


    if (element) {
      element.setAttribute(
        "content",
        value
      );
    }
  }


  function setStructuredData(value) {

    const structuredData =
      document.getElementById(
        "personStructuredData"
      );


    if (structuredData) {
      structuredData.textContent =
        JSON.stringify(value);
    }
  }


  function getSeoDescription(
    value,
    fallback
  ) {

    const text =
      String(value || fallback || "")
        .replace(/\s+/g, " ")
        .trim();


    if (text.length <= 160) {
      return text;
    }


    const shortened =
      text.slice(0, 157)
        .replace(/\s+\S*$/, "")
        .trim();


    return `${shortened || text.slice(0, 157)}…`;
  }


  function setLandingMetadata() {

    const description =
      "Create and share a developer portfolio with projects, skills, certificates, learning logs, achievements, and more.";


    document.title =
      "MyDevFolioHub | Developer Portfolio Builder";


    setMetadataContent(
      'meta[name="description"]',
      description
    );

    setMetadataContent(
      'meta[name="author"]',
      "MyDevFolioHub"
    );

    setMetadataContent(
      'meta[name="robots"]',
      "index, follow, max-image-preview:large"
    );

    setMetadataContent(
      'meta[property="og:title"]',
      "MyDevFolioHub | Developer Portfolio Builder"
    );

    setMetadataContent(
      'meta[property="og:description"]',
      description
    );

    setMetadataContent(
      'meta[property="og:url"]',
      getBasePageURL().href
    );

    setMetadataContent(
      'meta[property="og:image:alt"]',
      "MyDevFolioHub developer portfolio builder preview"
    );

    setMetadataContent(
      'meta[name="twitter:title"]',
      "MyDevFolioHub | Developer Portfolio Builder"
    );

    setMetadataContent(
      'meta[name="twitter:description"]',
      description
    );

    setMetadataContent(
      'meta[name="twitter:image:alt"]',
      "MyDevFolioHub developer portfolio builder preview"
    );


    const canonical =
      document.getElementById(
        "canonicalUrl"
      );


    if (canonical) {
      canonical.href =
        getBasePageURL().href;
    }


    setStructuredData({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "MyDevFolioHub",
      url: getBasePageURL().href,
      applicationCategory: "DeveloperApplication",
      description,
      operatingSystem: "Any"
    });
  }


  function setCommunityMetadata() {

    const title =
      "Developer Portfolio Community | MyDevFolioHub";

    const description =
      "Discover public developer portfolios, projects, skills, certificates, and learning journeys from the MyDevFolioHub community.";

    const url = getBasePageURL();
    url.searchParams.set("view", "community");


    document.title = title;

    setMetadataContent('meta[name="description"]', description);
    setMetadataContent('meta[name="author"]', "MyDevFolioHub");
    setMetadataContent('meta[name="robots"]', "index, follow, max-image-preview:large");
    setMetadataContent('meta[property="og:title"]', title);
    setMetadataContent('meta[property="og:description"]', description);
    setMetadataContent('meta[property="og:url"]', url.href);
    setMetadataContent('meta[property="og:image:alt"]', "MyDevFolioHub developer portfolio community preview");
    setMetadataContent('meta[name="twitter:title"]', title);
    setMetadataContent('meta[name="twitter:description"]', description);
    setMetadataContent('meta[name="twitter:image:alt"]', "MyDevFolioHub developer portfolio community preview");

    const canonical = document.getElementById("canonicalUrl");
    if (canonical) canonical.href = url.href;

    setStructuredData({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: url.href,
      isPartOf: {
        "@type": "WebSite",
        name: "MyDevFolioHub",
        url: getBasePageURL().href
      }
    });
  }


  function setPrivateViewMetadata(title) {

    document.title =
      `${title} | MyDevFolioHub`;

    setMetadataContent(
      'meta[name="robots"]',
      "noindex, follow"
    );

    const canonical =
      document.getElementById(
        "canonicalUrl"
      );

    if (canonical) {
      canonical.href =
        getBasePageURL().href;
    }
  }


  function setPortfolioMetadata(profile) {

    const displayName =
      profile.display_name
      ||
      profile.username;


    const description =
      getSeoDescription(
        profile.bio,
        `Explore ${displayName}'s developer portfolio, projects, skills, certificates, and learning journey.`
      );


    const title =
      `${String(displayName).replace(/\s+/g, " ").trim().slice(0, 48)} | Developer Portfolio`;


    document.title = title;


    setMetadataContent(
      'meta[name="description"]',
      description
    );

    setMetadataContent(
      'meta[name="author"]',
      displayName
    );

    setMetadataContent(
      'meta[name="robots"]',
      "index, follow, max-image-preview:large"
    );

    setMetadataContent(
      'meta[property="og:title"]',
      title
    );

    setMetadataContent(
      'meta[property="og:description"]',
      description
    );

    setMetadataContent(
      'meta[property="og:image:alt"]',
      `${displayName} portfolio preview`
    );

    setMetadataContent(
      'meta[name="twitter:title"]',
      title
    );

    setMetadataContent(
      'meta[name="twitter:description"]',
      description
    );

    setMetadataContent(
      'meta[name="twitter:image:alt"]',
      `${displayName} portfolio preview`
    );


    const portfolioURL =
      buildPortfolioURL(
        profile.username
      );


    setMetadataContent(
      'meta[property="og:url"]',
      portfolioURL
    );


    const canonical =
      document.getElementById(
        "canonicalUrl"
      );


    if (canonical) {
      canonical.href = portfolioURL;
    }


    const socialLinks =
      getProfileSocialLinks(profile);


    const sameAs =
      PROFILE_SOCIAL_PLATFORMS
        .filter(platform =>
          platform.type === "url"
        )
        .map(platform =>
          socialLinks[platform.key]
        )
        .filter(Boolean);


    setStructuredData({
      "@context":
        "https://schema.org",
      "@type": "Person",
      name: displayName,
      description,
      url: portfolioURL,
      sameAs,
      knowsAbout:
        Array.isArray(
          profile.tech_stack
        )
          ? profile.tech_stack
          : []
    });
  }


  function normalizePortfolioTheme(value) {
    return Object.prototype.hasOwnProperty.call(PORTFOLIO_THEMES, value)
      ? value
      : "cyber";
  }


  function applyPortfolioTheme(value) {
    const portfolioView = document.getElementById("portfolioView");
    if (!portfolioView) return;

    portfolioView.dataset.portfolioTheme =
      normalizePortfolioTheme(value);
  }


  function getSelectedPortfolioTheme() {
    return normalizePortfolioTheme(
      document.querySelector('input[name="portfolioTheme"]:checked')?.value
      || currentProfile?.portfolio_theme
      || "cyber"
    );
  }


  function previewPortfolioTheme(value) {
    const theme = normalizePortfolioTheme(value);
    const status = document.getElementById("portfolioThemeStatus");
    if (status) status.textContent = PORTFOLIO_THEMES[theme].toUpperCase();
    applyPortfolioTheme(theme);
  }


  function configurePortfolioThemeEditor(profile) {
    const hasColumn = Object.prototype.hasOwnProperty.call(
      profile || {},
      "portfolio_theme"
    );

    portfolioThemeDatabaseReady = hasColumn;
    const theme = normalizePortfolioTheme(profile?.portfolio_theme);
    const selected = document.querySelector(
      `input[name="portfolioTheme"][value="${theme}"]`
    );

    if (selected) selected.checked = true;

    const picker = document.getElementById("portfolioThemePicker");
    const note = document.getElementById("portfolioThemeMigrationNote");

    picker?.classList.toggle("is-disabled", !hasColumn);
    picker?.querySelectorAll("input").forEach(input => {
      input.disabled = !hasColumn;
    });

    if (note) note.hidden = hasColumn;
    previewPortfolioTheme(theme);
  }


  function configurePortfolioIdentity(
    profile
  ) {

    if (!profile) {
      return;
    }


    const displayName =
      profile.display_name
      ||
      profile.username;


    const username =
      profile.username;


    const bio =
      profile.bio || "";


    const initials =
      getProfileInitials(displayName);


    activePortfolioUserId =
      profile.user_id;

    activePortfolioUsername =
      username;


    currentProfile = {
      ...profile,
      description: bio,
      terminal_title:
        profile.terminal_title
        ||
        `~/${username}/README.md`
    };


    portfolioThemeDatabaseReady =
      Object.prototype.hasOwnProperty.call(
        profile,
        "portfolio_theme"
      );

    applyPortfolioTheme(
      profile.portfolio_theme
    );


    const logo =
      document.getElementById(
        "portfolioLogo"
      );


    if (logo) {
      logo.innerHTML =
        `<span>&gt;_</span> ${escapeHTML(
          username.toUpperCase()
        )}.DEV`;
    }


    document.getElementById(
      "profileDisplayName"
    ).textContent = displayName;


    document.getElementById(
      "profileUsername"
    ).textContent = `@${username}`;


    const specialtyElement =
      document.getElementById(
        "profileSpecialty"
      );


    if (specialtyElement) {
      const specialtyLabel =
        PROFILE_SPECIALTIES[
          profile.specialty
        ] || "";


      specialtyElement.textContent =
        specialtyLabel;
      specialtyElement.hidden =
        !specialtyLabel;
    }


    document.getElementById(
      "profileInitials"
    ).textContent = initials;


    document.getElementById(
      "profilePreviewInitials"
    ).textContent = initials;


    document.getElementById(
      "profileImage"
    ).alt =
      `${displayName} profile picture`;


    document.getElementById(
      "portfolioGreeting"
    ).textContent =
      `Hi, I'm ${displayName} 👋`;


    document.getElementById(
      "profileDescription"
    ).innerHTML =
      escapeHTML(bio)
        .replace(/\n/g, "<br>");


    const aboutDescription =
      document.getElementById(
        "aboutDescription"
      );


    if (aboutDescription) {
      aboutDescription.textContent = bio;
    }


    document.getElementById(
      "terminalBarText"
    ).textContent =
      currentProfile.terminal_title;


    document.getElementById(
      "contactHeading"
    ).textContent =
      "Let's Connect";


    renderSocialButtons(profile);
    renderPrimaryProfileLink(profile);


    document.getElementById(
      "contactDescription"
    ).textContent =
      "Have a question, feedback, or want to connect? Send me a message.";


    renderTechStack(
      profile.tech_stack
    );


    applyPortfolioSectionOrder(profile);


    if (isAdmin) {
      renderPortfolioLayoutManager(
        profile.section_order
      );
    }


    if (profile.image_path) {
      showProfileImage(
        getProfileImageURL(
          profile.image_path
        )
      );
    }

    else {
      clearMainProfileImage();
    }


    const dashboardWelcome =
      document.getElementById(
        "dashboardWelcome"
      );


    if (dashboardWelcome) {
      dashboardWelcome.textContent =
        `Manage @${username}`;
    }


    const roleBadge =
      document.getElementById(
        "accountRoleBadge"
      );


    if (roleBadge) {
      roleBadge.textContent =
        isPlatformAdmin
          ? "Platform Admin · Portfolio Owner"
          : "Portfolio Owner";
    }


    setPortfolioMetadata(profile);
    syncAccountControls();
  }


  async function loadPublicProfile(
    username
  ) {

    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("is_public", true)
        .maybeSingle();


    if (error) {
      throw error;
    }


    return data || null;
  }


  function showUserNotFound(
    username,
    message = ""
  ) {

    const element =
      document.getElementById(
        "userNotFoundMessage"
      );


    element.textContent =
      message
      ||
      `@${username} does not have a public portfolio.`;


    document.title =
      "Portfolio Not Found | MyDevFolioHub";


    setMetadataContent(
      'meta[name="robots"]',
      "noindex, follow"
    );

    setMetadataContent(
      'meta[name="description"]',
      "This public MyDevFolioHub portfolio could not be found."
    );


    showAppView("notFound");
  }


  function getGitHubUsernameForProfile(
    profile
  ) {

    const storedUsername =
      String(
        profile?.github_username
        ||
        ""
      ).trim();


    if (
      GITHUB_USERNAME_PATTERN
        .test(storedUsername)
    ) {
      return storedUsername;
    }


    return extractGitHubUsername(
      getProfileSocialLinks(profile)
        .github
    );
  }


  function renderGitHubLanguages(
    repositories
  ) {

    const container =
      document.getElementById(
        "githubLanguageSummary"
      );


    if (!container) {
      return;
    }


    const counts = new Map();


    repositories.forEach(repository => {
      const language =
        String(
          repository.language || ""
        ).trim();


      if (!language) {
        return;
      }


      counts.set(
        language,
        (counts.get(language) || 0) + 1
      );
    });


    const languages =
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);


    container.innerHTML = "";


    languages.forEach(
      ([language, count]) => {
        const chip =
          document.createElement("span");

        chip.className =
          "github-language-chip";


        const dot =
          document.createElement("span");

        dot.className =
          "github-language-dot";


        const label =
          document.createElement("span");

        label.textContent =
          `${language} · ${count}`;


        chip.appendChild(dot);
        chip.appendChild(label);
        container.appendChild(chip);
      }
    );
  }


  function renderGitHubRepositories(
    repositories
  ) {

    const container =
      document.getElementById(
        "githubRepositoriesGrid"
      );


    if (!container) {
      return;
    }


    container.innerHTML = "";


    repositories.forEach(repository => {
      const card =
        document.createElement("article");

      card.className =
        "project-card github-repository-card";


      const heading =
        document.createElement("div");

      heading.className =
        "project-card-heading";


      const icon =
        document.createElement("span");

      icon.className =
        "project-card-icon";

      icon.textContent = "⌘";


      const title =
        document.createElement("div");

      title.className =
        "project-title";

      title.textContent =
        repository.name;


      heading.appendChild(icon);
      heading.appendChild(title);


      const description =
        document.createElement("p");

      description.textContent =
        repository.description
        ||
        "Public GitHub repository.";


      const metadata =
        document.createElement("div");

      metadata.className =
        "github-repository-meta";


      [
        repository.language
          ? `● ${repository.language}`
          : "",
        `★ ${Number(
          repository.stargazers_count
          || 0
        )}`,
        `⑂ ${Number(
          repository.forks_count
          || 0
        )}`
      ]
        .filter(Boolean)
        .forEach(value => {
          const item =
            document.createElement("span");

          item.textContent = value;
          metadata.appendChild(item);
        });


      const link =
        document.createElement("a");

      link.className =
        "project-card-link";

      link.href =
        safeHttpUrl(
          repository.html_url
        );

      link.target = "_blank";
      link.rel =
        "noopener noreferrer";

      link.textContent =
        "Open repository ↗";


      card.appendChild(heading);
      card.appendChild(description);
      card.appendChild(metadata);
      card.appendChild(link);
      container.appendChild(card);
    });
  }


  async function loadGitHubHighlights() {

    const section =
      document.getElementById(
        "github-highlights"
      );


    const message =
      document.getElementById(
        "githubHighlightsMessage"
      );


    const repositoriesGrid =
      document.getElementById(
        "githubRepositoriesGrid"
      );


    const languageSummary =
      document.getElementById(
        "githubLanguageSummary"
      );


    if (
      !section
      || !message
      || !repositoriesGrid
      || !languageSummary
    ) {
      return;
    }


    const username =
      getGitHubUsernameForProfile(
        currentProfile
      );


    const navLink =
      document.getElementById(
        "githubHighlightsNavLink"
      );


    if (navLink) {
      navLink.hidden = !username;
    }


    repositoriesGrid.innerHTML = "";
    languageSummary.innerHTML = "";


    if (!username) {
      section.hidden = !isAdmin;
      message.style.display =
        isAdmin ? "block" : "none";

      message.textContent =
        isAdmin
          ? "Add your GitHub username from Edit Profile to show repositories automatically."
          : "";

      return;
    }


    section.hidden = false;
    message.style.display = "block";
    message.textContent =
      "Loading GitHub repositories...";


    const profileURL =
      `https://github.com/${encodeURIComponent(
        username
      )}`;


    const profileButton =
      document.getElementById(
        "githubProfileButton"
      );


    if (profileButton) {
      profileButton.href = profileURL;
    }


    const description =
      document.getElementById(
        "githubHighlightsDescription"
      );


    if (description) {
      description.textContent =
        `Top public repositories and languages from @${username}.`;
    }


    try {
      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(
          username
        )}/repos?per_page=100&type=owner&sort=updated`,
        {
          headers: {
            Accept:
              "application/vnd.github+json"
          }
        }
      );


      if (!response.ok) {
        throw new Error(
          `GITHUB_HTTP_${response.status}`
        );
      }


      const data = await response.json();


      if (!Array.isArray(data)) {
        throw new Error(
          "INVALID_GITHUB_RESPONSE"
        );
      }


      const repositories =
        data
          .filter(repository =>
            repository
            && !repository.fork
            && !repository.archived
            && safeHttpUrl(
              repository.html_url
            )
          )
          .sort((a, b) => {
            const popularity =
              Number(
                b.stargazers_count || 0
              )
              -
              Number(
                a.stargazers_count || 0
              );


            if (popularity !== 0) {
              return popularity;
            }


            return new Date(
              b.pushed_at || 0
            )
              -
              new Date(
                a.pushed_at || 0
              );
          })
          .slice(0, 6);


      renderGitHubLanguages(data);
      renderGitHubRepositories(
        repositories
      );


      message.style.display =
        repositories.length
          ? "none"
          : "block";

      message.textContent =
        repositories.length
          ? ""
          : "No public repositories found for this GitHub account.";
    }

    catch (error) {
      console.error(
        "GitHub highlights error:",
        error
      );

      message.style.display = "block";
      message.textContent =
        "GitHub highlights are temporarily unavailable. Visit the GitHub profile using the button above.";
    }
  }


  function normalizePortfolioSectionOrder(
    value
  ) {

    const rawValue =
      value
      && typeof value === "object"
      && !Array.isArray(value)
        ? value
        : {};


    const normalizeGroup =
      (groupName) => {
        const allowed =
          DEFAULT_SECTION_ORDER[
            groupName
          ];


        const requested =
          Array.isArray(
            rawValue[groupName]
          )
            ? rawValue[groupName]
            : [];


        const validRequested =
          requested.filter(
            (key, index) =>
              allowed.includes(key)
              &&
              requested.indexOf(key)
              === index
          );


        const normalized = [
          ...validRequested
        ];


        allowed.forEach(
          (key, defaultIndex) => {
            if (normalized.includes(key)) {
              return;
            }


            const nextExistingKey =
              allowed
                .slice(defaultIndex + 1)
                .find(nextKey =>
                  normalized.includes(nextKey)
                );


            if (!nextExistingKey) {
              normalized.push(key);
              return;
            }


            normalized.splice(
              normalized.indexOf(nextExistingKey),
              0,
              key
            );
          }
        );


        return normalized;
      };


    const contentOrder = normalizeGroup("content")
      .filter(key => key !== "contact");

    contentOrder.push("contact");

    return {
      profile:
        normalizeGroup("profile"),
      content:
        contentOrder
    };
  }


  function applyPortfolioSectionOrder(
    profile
  ) {

    const order =
      normalizePortfolioSectionOrder(
        profile?.section_order
      );


    const heroText =
      document.querySelector(
        ".hero-text"
      );


    const terminal =
      heroText?.querySelector(
        ":scope > .terminal"
      );


    if (heroText && terminal) {
      const profileBlocks =
        new Map(
          [...heroText.querySelectorAll(
            ":scope > [data-profile-block-key]"
          )]
            .map(element => [
              element.dataset
                .profileBlockKey,
              element
            ])
        );


      order.profile.forEach(key => {
        const block =
          profileBlocks.get(key);


        if (block) {
          heroText.insertBefore(
            block,
            terminal
          );
        }
      });
    }


    const main =
      document.querySelector(
        "#portfolioView main"
      );


    if (main) {
      const sections =
        new Map(
          [...main.querySelectorAll(
            ":scope > [data-portfolio-section-key]"
          )]
            .map(element => [
              element.dataset
                .portfolioSectionKey,
              element
            ])
        );


      order.content.forEach(key => {
        const section =
          sections.get(key);


        if (section) {
          main.appendChild(section);
        }
      });
    }
  }


  function moveLayoutOrderItem(
    groupName,
    key,
    direction
  ) {

    if (groupName === "content" && key === "contact") {
      return;
    }

    const items =
      currentLayoutOrder[groupName];


    const index =
      items.indexOf(key);


    const nextIndex =
      index + direction;


    if (
      index < 0
      || nextIndex < 0
      || nextIndex >= items.length
    ) {
      return;
    }


    [
      items[index],
      items[nextIndex]
    ] = [
      items[nextIndex],
      items[index]
    ];


    renderPortfolioLayoutManager(
      currentLayoutOrder
    );
  }


  function moveLayoutOrderBefore(
    groupName,
    sourceKey,
    targetKey
  ) {

    if (groupName === "content" && sourceKey === "contact") {
      return;
    }

    const items =
      currentLayoutOrder[groupName];


    const sourceIndex =
      items.indexOf(sourceKey);


    const targetIndex =
      items.indexOf(targetKey);


    if (
      sourceIndex < 0
      || targetIndex < 0
      || sourceIndex === targetIndex
    ) {
      return;
    }


    const [movedItem] =
      items.splice(sourceIndex, 1);


    const adjustedTargetIndex =
      items.indexOf(targetKey);


    items.splice(
      adjustedTargetIndex,
      0,
      movedItem
    );


    renderPortfolioLayoutManager(
      currentLayoutOrder
    );
  }


  function renderLayoutOrderList(
    groupName,
    containerId
  ) {

    const container =
      document.getElementById(
        containerId
      );


    if (!container) {
      return;
    }


    const items =
      currentLayoutOrder[groupName];


    container.innerHTML = "";


    items.forEach((key, index) => {
      const item =
        document.createElement("div");

      item.className =
        "layout-sort-item";

      const fixedLast =
        groupName === "content"
        && key === "contact";

      item.draggable = !fixedLast;
      item.classList.toggle(
        "is-fixed-last",
        fixedLast
      );
      item.dataset.layoutGroup =
        groupName;

      item.dataset.layoutKey = key;


      item.addEventListener(
        "dragstart",
        event => {
          item.classList.add(
            "is-dragging"
          );

          event.dataTransfer
            .setData(
              "text/plain",
              `${groupName}:${key}`
            );

          event.dataTransfer
            .effectAllowed = "move";
        }
      );


      item.addEventListener(
        "dragend",
        () => {
          item.classList.remove(
            "is-dragging"
          );
        }
      );


      item.addEventListener(
        "dragover",
        event => {
          event.preventDefault();
          event.dataTransfer.dropEffect =
            "move";
        }
      );


      item.addEventListener(
        "drop",
        event => {
          event.preventDefault();

          const [
            sourceGroup,
            sourceKey
          ] = event.dataTransfer
            .getData("text/plain")
            .split(":");


          if (sourceGroup !== groupName) {
            return;
          }


          moveLayoutOrderBefore(
            groupName,
            sourceKey,
            key
          );
        }
      );


      const handle =
        document.createElement("span");

      handle.className =
        "layout-drag-handle";

      handle.textContent = "⠿";
      handle.setAttribute(
        "aria-hidden",
        "true"
      );


      const label =
        document.createElement("strong");

      label.textContent =
        SECTION_LABELS[key] || key;


      const arrows =
        document.createElement("span");

      arrows.className =
        "layout-arrow-buttons";


      const upButton =
        document.createElement("button");

      upButton.type = "button";
      upButton.textContent = "↑";
      upButton.disabled =
        index === 0 || fixedLast;
      upButton.setAttribute(
        "aria-label",
        `Move ${label.textContent} up`
      );

      upButton.addEventListener(
        "click",
        () => {
          moveLayoutOrderItem(
            groupName,
            key,
            -1
          );
        }
      );


      const downButton =
        document.createElement("button");

      downButton.type = "button";
      downButton.textContent = "↓";
      downButton.disabled =
        index === items.length - 1
        || fixedLast;

      downButton.setAttribute(
        "aria-label",
        `Move ${label.textContent} down`
      );

      downButton.addEventListener(
        "click",
        () => {
          moveLayoutOrderItem(
            groupName,
            key,
            1
          );
        }
      );


      arrows.appendChild(upButton);
      arrows.appendChild(downButton);
      item.appendChild(handle);
      item.appendChild(label);
      item.appendChild(arrows);
      container.appendChild(item);
    });
  }


  function renderPortfolioLayoutManager(
    sectionOrder
  ) {

    currentLayoutOrder =
      normalizePortfolioSectionOrder(
        sectionOrder
      );


    renderLayoutOrderList(
      "profile",
      "profileBlockOrderList"
    );


    renderLayoutOrderList(
      "content",
      "contentSectionOrderList"
    );
  }


  async function savePortfolioLayout() {

    if (!isAdmin || !currentUser) {
      alert(
        "Open your Dashboard to edit this portfolio."
      );
      return;
    }


    const button =
      document.getElementById(
        "saveLayoutButton"
      );


    const message =
      document.getElementById(
        "layoutManagerMessage"
      );


    button.disabled = true;
    button.textContent =
      "Saving order...";

    message.classList.remove(
      "success"
    );

    message.textContent = "";


    const sectionOrder =
      normalizePortfolioSectionOrder(
        currentLayoutOrder
      );


    const { error } =
      await supabaseClient
        .from("profiles")
        .update({
          section_order:
            sectionOrder
        })
        .eq(
          "user_id",
          currentUser.id
        );


    button.disabled = false;
    button.textContent =
      "Save Section Order";


    if (error) {
      console.error(
        "Section order save error:",
        error
      );

      message.textContent =
        "Could not save the section order.";

      return;
    }


    currentProfile.section_order =
      sectionOrder;


    if (signedInProfile) {
      signedInProfile.section_order =
        sectionOrder;
    }


    applyPortfolioSectionOrder(
      currentProfile
    );


    message.classList.add(
      "success"
    );

    message.textContent =
      "Section order saved successfully ✓";
  }


  function formatDashboardMetric(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat("en", {
      notation: number >= 1000 ? "compact" : "standard",
      maximumFractionDigits: 1
    }).format(number);
  }


  function updatePortfolioCompletion() {
    if (!isAdmin) return;

    const projects = portfolioItems.filter(item => item.type === "project");
    const githubConnected = Boolean(
      currentProfile.github_url
      || currentProfile.github_username
      || currentProfile.social_links?.github
    );

    const checks = [
      ["Profile created", Boolean(currentProfile.user_id)],
      ["Bio added", Boolean(String(currentProfile.bio || currentProfile.description || "").trim())],
      ["Tech Stack added", Array.isArray(currentProfile.tech_stack) && currentProfile.tech_stack.length > 0],
      ["GitHub connected", githubConnected],
      ["Add profile picture", Boolean(currentProfile.image_path)],
      ["Add your first project", projects.length > 0],
      ["Add certificate", certificates.length > 0],
      ["Add Learning Log post", learningPosts.length > 0]
    ];

    const completed = checks.filter(([, done]) => done).length;
    const percent = Math.round((completed / checks.length) * 100);
    const percentElement = document.getElementById("portfolioCompletionPercent");
    const bar = document.getElementById("portfolioCompletionBar");
    const summary = document.getElementById("portfolioCompletionSummary");
    const checklist = document.getElementById("portfolioCompletionChecklist");

    percentElement.textContent = `${percent}%`;
    bar.style.width = `${percent}%`;
    summary.textContent = percent === 100
      ? "Portfolio complete 🎉"
      : `Your portfolio is ${percent}% complete`;

    checklist.innerHTML = "";
    checks.forEach(([label, done]) => {
      const item = document.createElement("div");
      item.className = `completion-check-item${done ? " done" : ""}`;

      const mark = document.createElement("b");
      mark.textContent = done ? "✓" : "○";

      const text = document.createElement("span");
      text.textContent = label;

      item.append(mark, text);
      checklist.appendChild(item);
    });
  }


  function getFallbackDashboardAnalytics() {
    const projects = portfolioItems.filter(item => item.type === "project");
    const projectViews = projects.reduce(
      (total, item) => total + getContentViewCount("project", item.id),
      0
    );
    const learningViews = learningPosts.reduce(
      (total, post) => total + getContentViewCount("learning_post", post.id),
      0
    );
    const mostViewed = projects
      .map(item => ({
        title: item.title,
        views: getContentViewCount("project", item.id)
      }))
      .sort((first, second) => second.views - first.views)[0];

    return {
      portfolio_views: getContentViewCount("portfolio", activePortfolioUserId),
      project_views: projectViews,
      learning_post_views: learningViews,
      most_viewed_project: mostViewed?.views
        ? mostViewed.title
        : "No project views yet"
    };
  }


  function renderDashboardAnalytics(analytics, migrationReady) {
    if (!isAdmin) return;

    document.getElementById("analyticsPortfolioViews").textContent =
      formatDashboardMetric(analytics.portfolio_views);
    document.getElementById("analyticsProjectViews").textContent =
      formatDashboardMetric(analytics.project_views);
    document.getElementById("analyticsLearningViews").textContent =
      formatDashboardMetric(analytics.learning_post_views);
    document.getElementById("analyticsMostViewedProject").textContent =
      analytics.most_viewed_project || "No project views yet";

    const note = document.getElementById("analyticsMigrationNote");
    if (note) note.hidden = migrationReady;
  }


  async function loadDashboardAnalytics() {
    if (!isAdmin || !currentUser) return;

    const fallback = getFallbackDashboardAnalytics();
    const { data, error } = await supabaseClient.rpc("get_my_portfolio_analytics");

    if (error || !data || typeof data !== "object") {
      renderDashboardAnalytics(fallback, false);
      return;
    }

    renderDashboardAnalytics({
      portfolio_views: data.portfolio_views ?? fallback.portfolio_views,
      project_views: data.project_views ?? fallback.project_views,
      learning_post_views: data.learning_post_views ?? fallback.learning_post_views,
      most_viewed_project: data.most_viewed_project || fallback.most_viewed_project
    }, true);
  }


  async function loadAllPortfolioData() {
    document.getElementById("downloadCvButton").disabled = true;
    document.getElementById("portfolioCvStatus").textContent = "Preparing portfolio data…";

    if (!activePortfolioUserId) {
      return;
    }


    contentViewCounts.clear();
    countedContentKeys.clear();


    await Promise.all([
      loadContentViewCounts(),
      loadProfile(),
      loadGitHubHighlights(),
      loadPortfolioItems(),
      loadLearningPosts(),
      loadCurrentLearningItems(),
      loadEducationItems(),
      loadAchievementBadges(),
      loadTestimonials(),
      loadGrowthItems(),
      loadKnowledgeSections(),
      loadCertificates()
    ]);


    updatePortfolioStatCounts();
    updateScrollInterface();


    updatePortfolioCompletion();
    document.getElementById("downloadCvButton").disabled = false;
    document.getElementById("portfolioCvStatus").textContent = "";
    await loadDashboardAnalytics();


    if (
      !isAdmin
      && activePortfolioUserId
      && currentUser?.id !== activePortfolioUserId
    ) {
      await recordContentView(
        "portfolio",
        activePortfolioUserId,
        { silent: true }
      );
    }
  }


  async function initializeApplication() {

    try {

      populateUserTechFilter();

      await checkExistingAdminSession();


      const parameters =
        new URLSearchParams(
          window.location.search
        );


      const requestedUsername =
        parameters.get("u");


      const requestedView =
        parameters.get("view");

      if (requestedView === "community") {
        isAdmin = false;
        setCommunityMetadata();
        updateLandingForSession();
        showAppView("community");
        await Promise.all([loadFeaturedPortfolios(), loadPublicUserDirectory()]);
        return;
      }


      if (
        requestedView ===
        "reset-password"
      ) {

        showPasswordReset(
          currentUser
          || passwordRecoveryEventReceived
            ? ""
            : "This reset link is invalid or has expired. Request a new link."
        );


        return;
      }


      if (requestedUsername !== null) {

        const username =
          requestedUsername
            .trim()
            .toLowerCase();


        if (!USERNAME_PATTERN.test(username)) {
          showUserNotFound(username);
          return;
        }


        const profile =
          await loadPublicProfile(username);


        if (!profile) {
          showUserNotFound(username);
          return;
        }


        isAdmin = false;

        configurePortfolioIdentity(
          profile
        );

        showAppView("portfolio");
        updateAdminInterface();

        await loadAllPortfolioData();

        return;
      }


      if (requestedView === "dashboard") {

        if (!currentUser) {
          showAuthScreen(
            "login",
            "Login to open your dashboard."
          );

          return;
        }


        if (!signedInProfile) {
          showOnboarding();
          return;
        }


        isAdmin = true;

        configurePortfolioIdentity(
          signedInProfile
        );

        setPrivateViewMetadata(
          "Dashboard"
        );

        showAppView("portfolio");
        updateAdminInterface();

        await loadAllPortfolioData();

        // Loading the signed-in profile refreshes public portfolio metadata.
        // Restore the private dashboard directive after all profile data is ready.
        setPrivateViewMetadata(
          "Dashboard"
        );

        return;
      }


      if (requestedView === "onboarding") {

        if (!currentUser) {
          showAuthScreen("login");
        }

        else if (signedInProfile) {
          openDashboard();
        }

        else {
          showOnboarding();
        }


        return;
      }


      if (requestedView === "login") {
        showAuthScreen("login");
        return;
      }


      if (requestedView === "signup") {
        showAuthScreen("signup");
        return;
      }


      if (
        requestedView ===
        "forgot-password"
      ) {
        showAuthScreen("forgot");
        return;
      }


      if (currentUser && !signedInProfile) {
        showOnboarding();
        return;
      }


      isAdmin = false;

      setLandingMetadata();
      updateLandingForSession();
      showAppView("landing");

    }

    catch (error) {

      console.error(
        "Application initialization error:",
        error
      );


      showUserNotFound(
        "",
        "The platform could not load right now. Please refresh and try again."
      );
    }
  }



  /* =========================================
     THEME
  ========================================= */

  const THEME_STORAGE_KEY =
    "bassamTheme";


  const THEME_META_COLORS = {
    gradient: "#11010a",
    classic: "#0d1117",
    light: "#f5f2fc"
  };


  const THEME_NEXT = {
    gradient: "light",
    light: "classic",
    classic: "gradient"
  };


  const THEME_LABELS = {
    gradient: { next: "Light", icon: "☀", title: "Switch to light theme" },
    light: { next: "Classic", icon: "◐", title: "Switch to classic theme" },
    classic: { next: "Gradient", icon: "☾", title: "Switch to gradient theme" }
  };


  function normalizeSiteTheme(value) {

    if (
      value === "classic"
      ||
      value === "light"
      ||
      value === "gradient"
    ) {
      return value;
    }

    return "gradient";
  }


  function applyTheme(
    theme,
    savePreference = false
  ) {

    const normalized =
      normalizeSiteTheme(theme);

    const isGradient =
      normalized === "gradient";


    document.documentElement
      .toggleAttribute(
        "data-theme",
        !isGradient
      );


    if (!isGradient) {

      document.documentElement
        .setAttribute(
          "data-theme",
          normalized
        );

    }


    const meta =
      THEME_LABELS[normalized];


    const themeColor =
      document.getElementById(
        "themeColorMeta"
      );


    [
      "themeToggle",
      "landingThemeToggle"
    ].forEach((buttonId, index) => {

      const button =
        document.getElementById(
          buttonId
        );

      if (!button) {
        return;
      }

      button.setAttribute(
        "aria-pressed",
        String(normalized === "light")
      );

      button.title = meta.title;

      const buttonLabel =
        document.getElementById(
          index === 0
            ?
            "themeToggleLabel"
            :
            "landingThemeToggleLabel"
        );

      if (buttonLabel) {
        buttonLabel.textContent = meta.next;
      }

      const buttonIcon =
        document.getElementById(
          index === 0
            ?
            "themeToggleIcon"
            :
            "landingThemeToggleIcon"
        );

      if (buttonIcon) {
        buttonIcon.textContent = meta.icon;
      }

    });


    if (themeColor) {

      themeColor.setAttribute(
        "content",
        THEME_META_COLORS[normalized]
      );

    }


    if (savePreference) {

      try {

        localStorage.setItem(
          THEME_STORAGE_KEY,
          normalized
        );

      }

      catch (error) {

        console.warn(
          "Theme preference could not be saved:",
          error
        );

      }

    }
  }


  function loadSavedTheme() {

    let storedTheme = null;


    try {

      storedTheme =
        localStorage.getItem(
          THEME_STORAGE_KEY
        );

    }

    catch {

      storedTheme = null;

    }


    if (
      storedTheme === "teal"
      ||
      storedTheme === null
      ||
      storedTheme === undefined
      ||
      storedTheme === ""
    ) {

      let prefersLight = false;

      try {

        prefersLight =
          window.matchMedia(
            "(prefers-color-scheme: light)"
          ).matches;

      }

      catch {

        prefersLight = false;

      }

      applyTheme(
        storedTheme === "teal"
          ?
          "gradient"
          :
          (
            storedTheme
            ||
            (prefersLight ? "light" : "gradient")
          )
      );

      return;
    }


    applyTheme(storedTheme);
  }


  function toggleTheme() {

    const currentTheme =
      normalizeSiteTheme(
        document.documentElement
          .getAttribute(
            "data-theme"
          )
          ||
          "gradient"
      );


    applyTheme(
      THEME_NEXT[currentTheme],
      true
    );
  }


  loadSavedTheme();


  /* =========================================
     LANGUAGE (AR / EN) — landing view
  ========================================= */

  const LANG_STORAGE_KEY =
    "bassamLang";


  let releaseHistoryExpanded = false;


  function renderReleaseHistoryControl() {

    const button =
      document.getElementById(
        "releaseHistoryToggle"
      );


    if (!button) {
      return;
    }


    const items =
      document.querySelectorAll(
        ".release-history-item"
      );


    items.forEach(item => {
      item.hidden = !releaseHistoryExpanded;
    });


    button.setAttribute(
      "aria-expanded",
      String(releaseHistoryExpanded)
    );


    const isArabic =
      getCurrentLanguage() === "ar";


    document.getElementById(
      "releaseHistoryLabel"
    ).textContent = releaseHistoryExpanded
      ? (isArabic ? "إخفاء التحديثات السابقة" : "Hide previous updates")
      : (isArabic ? "عرض التحديثات السابقة" : "Show previous updates");


    document.getElementById(
      "releaseHistoryCount"
    ).textContent = isArabic
      ? `${items.length} إصدارات`
      : `${items.length} releases`;
  }


  function toggleReleaseHistory() {

    releaseHistoryExpanded =
      !releaseHistoryExpanded;


    renderReleaseHistoryControl();
  }


  function getCurrentLanguage() {
    return document.documentElement
      .getAttribute("lang") === "ar"
      ?
      "ar"
      :
      "en";
  }


  function setLanguage(
    lang,
    savePreference = false
  ) {

    const normalized =
      lang === "ar" ? "ar" : "en";

    const isArabic =
      normalized === "ar";


    document.documentElement
      .setAttribute(
        "lang",
        normalized
      );

    document.documentElement
      .setAttribute(
        "dir",
        isArabic ? "rtl" : "ltr"
      );


    document
      .querySelectorAll(
        "#landingView [data-en-html], #communityView [data-en-html], #authView [data-en-html], dialog [data-en-html], #appLoading[data-en-html]"
      )
      .forEach(element => {

        const value =
          isArabic
            ?
            element.getAttribute("data-ar-html")
            :
            element.getAttribute("data-en-html");

        if (
          value !== null
          &&
          value !== undefined
        ) {
          element.innerHTML = value;
        }

      });


    document
      .querySelectorAll(
        "#landingView [data-en-ph], #authView [data-en-ph]"
      )
      .forEach(element => {

        const value =
          isArabic
            ?
            element.getAttribute("data-ar-ph")
            :
            element.getAttribute("data-en-ph");

        if (
          value !== null
          &&
          value !== undefined
        ) {
          element.setAttribute(
            "placeholder",
            value
          );
        }

      });


    document
      .querySelectorAll(
        "#landingView [data-en-al], #authView [data-en-al]"
      )
      .forEach(element => {

        const value =
          isArabic
            ?
            element.getAttribute("data-ar-al")
            :
            element.getAttribute("data-en-al");

        if (
          value !== null
          &&
          value !== undefined
        ) {
          element.setAttribute(
            "aria-label",
            value
          );
        }

      });


    try {

      const authView =
        document.getElementById(
          "authView"
        );

      if (
        authView
        &&
        !authView.hidden
        &&
        typeof selectAuthMode === "function"
        &&
        typeof authMode !== "undefined"
      ) {
        selectAuthMode(authMode);
      }

    }

    catch {

      // Auth view is not ready yet; static labels are already translated.

    }


    const langLabel =
      document.getElementById(
        "landingLangToggleLabel"
      );

    if (langLabel) {
      langLabel.textContent =
        isArabic ? "EN" : "عربي";
    }


    const langButton =
      document.getElementById(
        "landingLangToggle"
      );

    if (langButton) {
      langButton.title =
        isArabic
          ?
          "Switch to English"
          :
          "التبديل إلى العربية";
    }


    if (savePreference) {

      try {

        localStorage.setItem(
          LANG_STORAGE_KEY,
          normalized
        );

      }

      catch (error) {

        console.warn(
          "Language preference could not be saved:",
          error
        );

      }

    }


    renderReleaseHistoryControl();
  }


  function toggleLanguage() {
    setLanguage(
      getCurrentLanguage() === "ar" ? "en" : "ar",
      true
    );
  }


  function loadSavedLanguage() {

    let storedLang = null;

    try {

      storedLang =
        localStorage.getItem(
          LANG_STORAGE_KEY
        );

    }

    catch {

      storedLang = null;

    }

    setLanguage(storedLang === "ar" ? "ar" : "en");
  }


  loadSavedLanguage();


  /* =========================================
     SCROLL PROGRESS + CURSOR GLOW
  ========================================= */

  function initializeScrollProgress() {

    const bar =
      document.getElementById(
        "scrollProgress"
      );

    if (!bar) {
      return;
    }

    let ticking = false;

    const update = () => {

      ticking = false;

      const max =
        document.documentElement.scrollHeight
        -
        window.innerHeight;

      bar.style.transform =
        `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1).toFixed(4) : 0})`;

    };

    window.addEventListener(
      "scroll",
      () => {

        if (ticking) {
          return;
        }

        ticking = true;
        window.requestAnimationFrame(update);

      },
      { passive: true }
    );

    update();
  }


  function initializeCursorGlow() {

    const glow =
      document.getElementById(
        "cursorGlow"
      );

    if (!glow) {
      return;
    }

    let finePointer = false;
    let reduceMotion = false;

    try {

      finePointer =
        window.matchMedia("(pointer: fine)").matches;

      reduceMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    }

    catch {
      return;
    }

    if (!finePointer || reduceMotion) {
      return;
    }

    glow.classList.add("on");

    let frame = 0;
    let x = window.innerWidth / 2;
    let y = 160;

    window.addEventListener(
      "mousemove",
      event => {

        x = event.clientX;
        y = event.clientY;

        if (frame) {
          return;
        }

        frame = window.requestAnimationFrame(() => {
          frame = 0;
          glow.style.transform =
            `translate(${x - 260}px, ${y - 260}px)`;
        });

      },
      { passive: true }
    );

  }


  initializeScrollProgress();
  initializeCursorGlow();


  /* =========================================
     SCROLL INTERACTIONS
  ========================================= */

  let revealObserver = null;


  function observeRevealElement(
    element
  ) {

    if (!element) {
      return;
    }


    element.classList.add(
      "reveal-on-scroll"
    );


    if (!revealObserver) {

      element.classList.add(
        "reveal-visible"
      );

      return;
    }


    revealObserver.observe(
      element
    );
  }


  function initializeRevealAnimations() {

    const reduceMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;


    if (
      reduceMotion
      ||
      !("IntersectionObserver" in window)
    ) {

      document
        .querySelectorAll(
          "main > section"
        )
        .forEach(
          section => {

            section.classList.add(
              "reveal-on-scroll",
              "reveal-visible"
            );

          }
        );

      return;
    }


    revealObserver =
      new IntersectionObserver(
        entries => {

          entries.forEach(
            entry => {

              if (!entry.isIntersecting) {
                return;
              }


              entry.target.classList.add(
                "reveal-visible"
              );


              revealObserver.unobserve(
                entry.target
              );

            }
          );

        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -45px"
        }
      );


    document
      .querySelectorAll(
        "main > section"
      )
      .forEach(
        observeRevealElement
      );
  }


  function updateScrollInterface() {

    const documentElement =
      document.documentElement;


    const scrollableHeight =
      documentElement.scrollHeight
      -
      window.innerHeight;


    const progress =
      scrollableHeight > 0
        ?
        Math.min(
          window.scrollY
          /
          scrollableHeight,
          1
        )
        :
        0;


    const progressBar =
      document.getElementById(
        "portfolioScrollProgress"
      );


    if (progressBar) {

      progressBar.style.transform =
        `scaleY(${progress})`;

    }


    const backToTop =
      document.getElementById(
        "backToTop"
      );


    if (backToTop) {

      backToTop.classList.toggle(
        "visible",
        window.scrollY > 500
      );

    }


    const sections =
      Array.from(
        document.querySelectorAll(
          "main section[id]"
        )
      );


    const position =
      window.scrollY
      +
      window.innerHeight * 0.32;


    let activeSection =
      sections[0]?.id || "home";


    sections.forEach(
      section => {

        if (
          section.offsetTop
          <=
          position
        ) {

          activeSection =
            section.id;

        }

      }
    );


    document
      .querySelectorAll(
        "nav a[href^='#']"
      )
      .forEach(
        link => {

          link.classList.toggle(
            "active",
            link.getAttribute("href")
            ===
            `#${activeSection}`
          );

        }
      );
  }


  function scrollToTop() {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }


  initializeRevealAnimations();


  updateScrollInterface();


  window.addEventListener(
    "scroll",
    updateScrollInterface,
    {
      passive: true
    }
  );


  window.addEventListener(
    "resize",
    updateScrollInterface
  );


  function animateStatValue(
    elementId,
    targetValue
  ) {

    const element =
      document.getElementById(
        elementId
      );


    if (!element) {
      return;
    }


    const target =
      Math.max(
        Number(targetValue) || 0,
        0
      );


    const start =
      Number(element.textContent)
      ||
      0;


    if (start === target) {
      return;
    }


    const reduceMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;


    if (reduceMotion) {

      element.textContent =
        String(target);

      return;
    }


    const startedAt =
      performance.now();


    const duration = 700;


    function updateValue(now) {

      const progress =
        Math.min(
          (now - startedAt)
          /
          duration,
          1
        );


      const eased =
        1
        -
        Math.pow(
          1 - progress,
          3
        );


      element.textContent =
        String(
          Math.round(
            start
            +
            (target - start)
            *
            eased
          )
        );


      if (progress < 1) {

        requestAnimationFrame(
          updateValue
        );

      }
    }


    requestAnimationFrame(
      updateValue
    );
  }


  function updatePortfolioStatCounts() {

    const projectCount =
      typeof portfolioItems
      ===
      "undefined"
        ?
        0
        :
        portfolioItems.filter(
          item =>
            item.type === "project"
        ).length;


    const labCount =
      typeof portfolioItems
      ===
      "undefined"
        ?
        0
        :
        portfolioItems.filter(
          item =>
            item.type === "lab"
        ).length;


    const certificateCount =
      typeof certificates
      ===
      "undefined"
        ?
        0
        :
        certificates.length;


    animateStatValue(
      "projectsCount",
      projectCount
    );


    animateStatValue(
      "labsCount",
      labCount
    );


    animateStatValue(
      "certificatesCount",
      certificateCount
    );
  }


  /* =========================================
     CONTENT VIEW COUNTS
  ========================================= */

  const contentViewCounts =
    new Map();

  const countedContentKeys =
    new Set();

  let contentViewObserver = null;


  function getContentViewKey(
    contentType,
    contentId
  ) {

    return `${contentType}:${contentId}`;
  }


  function getContentViewCount(
    contentType,
    contentId
  ) {

    return contentViewCounts.get(
      getContentViewKey(
        contentType,
        contentId
      )
    ) || 0;
  }


  function formatContentViewCount(
    value
  ) {

    const count =
      Number(value) || 0;


    return `◉ ${count} ${
      count === 1
        ?
        "view"
        :
        "views"
    }`;
  }


  function updateContentViewElements(
    key,
    count
  ) {

    document
      .querySelectorAll(
        "[data-view-key]"
      )
      .forEach(
        element => {

          if (
            element.dataset.viewKey
            ===
            key
          ) {

            element.textContent =
              formatContentViewCount(
                count
              );

          }

        }
      );
  }


  async function loadContentViewCounts() {

    const { data, error } =
      await supabaseClient
        .from("content_views")
        .select(
          "content_type, content_id, view_count"
        )
        .eq(
          "user_id",
          activePortfolioUserId
        );


    if (error) {

      console.error(
        "Content view counts loading error:",
        error
      );

      return;
    }


    (data || []).forEach(
      item => {

        const key =
          getContentViewKey(
            item.content_type,
            item.content_id
          );


        const count =
          Number(item.view_count)
          ||
          0;


        contentViewCounts.set(
          key,
          count
        );


        updateContentViewElements(
          key,
          count
        );
      }
    );
  }


  async function recordContentView(
    contentType,
    contentId,
    options = {}
  ) {

    const key =
      getContentViewKey(
        contentType,
        contentId
      );


    const storageKey =
      `portfolioViewed:${activePortfolioUserId}:${key}`;


    let alreadyCounted =
      countedContentKeys.has(key);


    try {

      alreadyCounted =
        alreadyCounted
        ||
        sessionStorage.getItem(
          storageKey
        ) === "1";

    }

    catch {
      // The in-memory set still prevents repeats.
    }


    if (alreadyCounted) {
      return;
    }


    countedContentKeys.add(key);


    const { data, error } =
      await supabaseClient.rpc(
        "increment_content_view",
        {
          p_content_type:
            contentType,
          p_content_id:
            contentId
        }
      );


    if (error) {

      countedContentKeys.delete(key);

      if (!options.silent) {
        console.error(
          "Content view count error:",
          error
        );
      }

      return;
    }


    try {

      sessionStorage.setItem(
        storageKey,
        "1"
      );

    }

    catch {
      // Counting still works when storage is unavailable.
    }


    const count =
      Number(data)
      ||
      0;


    contentViewCounts.set(
      key,
      count
    );


    updateContentViewElements(
      key,
      count
    );
  }


  function trackContentView(
    element,
    contentType,
    contentId
  ) {

    if (
      !element
      ||
      !contentViewObserver
      ||
      isAdmin
      ||
      currentUser?.id === activePortfolioUserId
    ) {

      return;
    }


    element.dataset.contentType =
      contentType;

    element.dataset.contentId =
      contentId;


    contentViewObserver.observe(
      element
    );
  }


  if (
    "IntersectionObserver" in window
  ) {

    contentViewObserver =
      new IntersectionObserver(
        entries => {

          entries.forEach(
            entry => {

              if (!entry.isIntersecting) {
                return;
              }


              contentViewObserver
                .unobserve(
                  entry.target
                );


              recordContentView(
                entry.target.dataset
                  .contentType,
                entry.target.dataset
                  .contentId
              );
            }
          );
        },
        {
          threshold: 0.6
        }
      );
  }


  /* =========================================
     YEAR
  ========================================= */

  document
    .getElementById("year")
    .textContent =
    new Date()
      .getFullYear();



  /* =========================================
     TERMINAL BAR
  ========================================= */

  async function editTerminalBar() {

    if (!isAdmin) {
      alert("Open your Dashboard to edit this portfolio.");
      return;
    }

    const element =
      document.getElementById(
        "terminalBarText"
      );


    const value =
      prompt(
        "Enter terminal title:",
        element.textContent.trim()
      );


    if (
      value === null
      ||
      !value.trim()
    ) {

      return;

    }


    const terminalTitle =
      value.trim();


    const { error } =
      await supabaseClient
        .from("profiles")
        .update({
          terminal_title: terminalTitle
        })
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {
      console.error(
        "Terminal title save error:",
        error
      );

      alert(
        "Could not save terminal title."
      );

      return;
    }


    currentProfile.terminal_title =
      terminalTitle;


    if (signedInProfile) {
      signedInProfile.terminal_title =
        terminalTitle;
    }

    element.textContent =
      terminalTitle;

  }



  /* =========================================
     TERMINAL ANIMATION
  ========================================= */

  const commands = [

    "whoami",

    "cat about-me.txt",

    "ls cybersecurity-projects/",

    "python learning.py",

    "sudo keep-learning"

  ];


  let commandIndex = 0;
  let characterIndex = 0;
  let deleting = false;


  const commandElement =
    document.getElementById(
      "command"
    );


  function terminalAnimation() {

    const current =
      commands[commandIndex];


    if (!deleting) {

      commandElement.textContent =
        current.substring(
          0,
          characterIndex
        );


      characterIndex++;


      if (
        characterIndex >
        current.length
      ) {

        deleting = true;

        setTimeout(
          terminalAnimation,
          1200
        );

        return;

      }

    }

    else {

      commandElement.textContent =
        current.substring(
          0,
          characterIndex
        );


      characterIndex--;


      if (
        characterIndex < 0
      ) {

        deleting = false;

        commandIndex =
          (
            commandIndex + 1
          )
          %
          commands.length;

        characterIndex = 0;

      }

    }


    setTimeout(
      terminalAnimation,
      deleting ? 35 : 80
    );

  }


  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    commandElement.textContent = commands[0];
  }
  else {
    terminalAnimation();
  }



  /* =========================================
     PROFILE + TERMINAL TITLE - SUPABASE
  ========================================= */

  let currentProfile = {
    description:
      document
        .getElementById(
          "profileDescription"
        )
        .innerText
        .trim(),

    image_path:
      null,

    terminal_title:
      document
        .getElementById(
          "terminalBarText"
        )
        .textContent
        .trim()
  };


  let temporaryProfileFile =
    null;

  let removeProfileImageRequested =
    false;


  function getProfileImageURL(
    filePath
  ) {

    if (!filePath) {
      return "";
    }


    const { data } =
      supabaseClient
        .storage
        .from(
          "portfolio-files"
        )
        .getPublicUrl(
          filePath
        );


    return (
      data?.publicUrl
      ||
      ""
    );
  }


  function renderProfile() {

    configurePortfolioIdentity(
      currentProfile
    );
  }


  async function loadProfile() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq(
          "user_id",
          activePortfolioUserId
        )
        .maybeSingle();


    if (error) {

      console.error(
        "Profile loading error:",
        error
      );

      return;
    }


    if (!data) {

      console.warn(
        "Portfolio profile was not found."
      );

      return;
    }


    currentProfile = {
      ...data,
      description:
        data.bio || "",
      image_path:
        data.image_path || null,
      terminal_title:
        data.terminal_title
        ||
        `~/${data.username}/README.md`
    };


    if (
      currentUser
      &&
      data.user_id === currentUser.id
    ) {
      signedInProfile = data;
    }


    renderProfile();
  }


  function openProfileEditor() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    temporaryProfileFile =
      null;

    removeProfileImageRequested =
      false;


    document
      .getElementById(
        "profileImageInput"
      )
      .value =
      "";


    document
      .getElementById(
        "profileDisplayNameInput"
      )
      .value =
      currentProfile.display_name
      ||
      "";


    document
      .getElementById(
        "profileUsernameInput"
      )
      .value =
      currentProfile.username
      ||
      "";


    document
      .getElementById(
        "profileReadmeTitleInput"
      )
      .value =
      currentProfile.terminal_title
      ||
      `~/${currentProfile.username || "portfolio"}/README.md`;


    document
      .getElementById(
        "profileDescriptionInput"
      )
      .value =
      currentProfile.description;


    document
      .getElementById(
        "profileSpecialtyInput"
      )
      .value =
      PROFILE_SPECIALTIES[
        currentProfile.specialty
      ]
        ? currentProfile.specialty
        : "other";


    const socialLinks =
      getProfileSocialLinks(
        currentProfile
      );


    PROFILE_SOCIAL_PLATFORMS
      .forEach(platform => {
        const input =
          document.getElementById(
            platform.inputId
          );


        if (input) {
          input.value =
            socialLinks[platform.key]
            ||
            "";
        }
      });


    document
      .getElementById(
        "profileGithubUsernameInput"
      )
      .value =
      currentProfile.github_username
      ||
      extractGitHubUsername(
        socialLinks.github
      );


    document
      .getElementById(
        "profilePrimaryLinkInput"
      )
      .value =
      currentProfile.primary_link_key
      ||
      "";


    selectedProfileTechnologies =
      Array.isArray(
        currentProfile.tech_stack
      )
        ? [
            ...new Set(
              currentProfile.tech_stack
                .map(item =>
                  String(item || "")
                    .trim()
                )
                .filter(Boolean)
            )
          ].slice(0, 30)
        : [];


    const techSearch =
      document.getElementById(
        "profileTechSearch"
      );


    if (techSearch) {
      techSearch.value = "";
    }


    syncSelectedTechStack();
    renderTechStackPicker();
    updateProfileReadmePreview();
    configurePortfolioThemeEditor(currentProfile);


    resetProfilePreview();


    if (currentProfile.image_path) {

      showProfilePreview(
        getProfileImageURL(
          currentProfile.image_path
        )
      );

    }


    document
      .getElementById(
        "profileModal"
      )
      .style.display =
      "flex";
  }


  function closeProfileEditor() {

    document
      .getElementById(
        "profileModal"
      )
      .style.display =
      "none";


    document
      .getElementById(
        "profileImageInput"
      )
      .value =
      "";


    temporaryProfileFile =
      null;

    removeProfileImageRequested =
      false;


    applyPortfolioTheme(
      currentProfile?.portfolio_theme
    );
  }


  function resetProfilePreview() {

    const image =
      document.getElementById(
        "profilePreviewImage"
      );


    const initials =
      document.getElementById(
        "profilePreviewInitials"
      );


    image.src = "";
    image.style.display = "none";

    initials.style.display = "block";
  }


  document
    .getElementById(
      "profileImageInput"
    )
    .addEventListener(
      "change",
      function () {

        const file =
          this.files[0];


        if (!file) {
          return;
        }


        const allowedTypes = [

          "image/jpeg",

          "image/png",

          "image/webp"

        ];


        if (
          !allowedTypes.includes(
            file.type
          )
        ) {

          alert(
            "Use PNG, JPG or WebP."
          );

          this.value = "";

          return;
        }


        if (
          file.size >
          2 * 1024 * 1024
        ) {

          alert(
            "Image must be under 2 MB."
          );

          this.value = "";

          return;
        }


        temporaryProfileFile =
          file;

        removeProfileImageRequested =
          false;


        const reader =
          new FileReader();


        reader.onload =
          event => {

            showProfilePreview(
              event.target.result
            );

          };


        reader.readAsDataURL(
          file
        );

      }
    );


  function showProfilePreview(image) {

    const preview =
      document.getElementById(
        "profilePreviewImage"
      );


    const initials =
      document.getElementById(
        "profilePreviewInitials"
      );


    preview.src =
      image;

    preview.style.display =
      "block";

    initials.style.display =
      "none";
  }


  function showProfileImage(image) {

    const mainImage =
      document.getElementById(
        "profileImage"
      );


    const initials =
      document.getElementById(
        "profileInitials"
      );


    mainImage.src =
      image;

    mainImage.style.display =
      "block";

    initials.style.display =
      "none";
  }


  function clearMainProfileImage() {

    const mainImage =
      document.getElementById(
        "profileImage"
      );


    const initials =
      document.getElementById(
        "profileInitials"
      );


    mainImage.src =
      "";

    mainImage.style.display =
      "none";

    initials.style.display =
      "block";
  }


  async function saveProfile() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    const displayName =
      document
        .getElementById(
          "profileDisplayNameInput"
        )
        .value
        .trim();


    const description =
      document
        .getElementById(
          "profileDescriptionInput"
        )
        .value
        .trim();


    const specialty =
      document
        .getElementById(
          "profileSpecialtyInput"
        )
        .value;


    const terminalTitle =
      document
        .getElementById(
          "profileReadmeTitleInput"
        )
        .value
        .trim();


    const githubUsernameInput =
      document
        .getElementById(
          "profileGithubUsernameInput"
        )
        .value
        .trim();


    const primaryLinkKey =
      document
        .getElementById(
          "profilePrimaryLinkInput"
        )
        .value;


    const socialInputs =
      readProfileSocialEditor();


    const socialLinks = {};


    for (
      const platform
      of PROFILE_SOCIAL_PLATFORMS
    ) {
      const inputValue =
        socialInputs[platform.key];


      if (!inputValue) {
        continue;
      }


      const safeValue =
        platform.type === "email"
          ? safePublicEmail(inputValue)
          : safeHttpUrl(inputValue);


      if (!safeValue) {
        alert(
          platform.type === "email"
            ? "Enter a valid public email."
            : `Enter a valid http or https link for ${platform.label}.`
        );

        return;
      }


      socialLinks[platform.key] =
        safeValue;
    }


    const githubURL =
      socialLinks.github || "";


    const linkedinURL =
      socialLinks.linkedin || "";


    const publicEmail =
      socialLinks.email || "";


    const githubUsername =
      githubUsernameInput
      ||
      extractGitHubUsername(
        githubURL
      );


    const techStack =
      selectedProfileTechnologies
        .map(item =>
          String(item || "").trim()
        )
        .filter(Boolean)
        .slice(0, 30);


    const portfolioTheme =
      getSelectedPortfolioTheme();


    if (!displayName) {
      alert("Enter a display name.");
      return;
    }


    if (!description) {

      alert(
        "Enter a profile description."
      );

      return;
    }


    if (!PROFILE_SPECIALTIES[specialty]) {
      alert("Choose a valid specialty.");
      return;
    }


    if (
      !terminalTitle
      ||
      terminalTitle.length > 120
    ) {
      alert(
        "README title must be between 1 and 120 characters."
      );
      return;
    }


    if (
      githubUsername
      &&
      !GITHUB_USERNAME_PATTERN
        .test(githubUsername)
    ) {
      alert(
        "Enter a valid GitHub username."
      );
      return;
    }


    if (
      primaryLinkKey
      &&
      !socialLinks[primaryLinkKey]
    ) {
      alert(
        "Add the selected featured link before saving."
      );
      return;
    }


    const previousImagePath =
      currentProfile.image_path;

    let nextImagePath =
      removeProfileImageRequested
        ? null
        : previousImagePath;

    let uploadedImagePath =
      null;


    if (temporaryProfileFile) {

      const safeFileName =
        temporaryProfileFile.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          );


      uploadedImagePath =
        `users/${currentUser.id}/profile/`
        +
        Date.now()
        +
        "-"
        +
        generateId()
        +
        "-"
        +
        safeFileName;


      const {
        error: uploadError
      } =
        await supabaseClient
          .storage
          .from(
            "portfolio-files"
          )
          .upload(
            uploadedImagePath,
            temporaryProfileFile,
            {
              contentType:
              temporaryProfileFile.type,

              upsert:
                false
            }
          );


      if (uploadError) {

        console.error(
          "Profile image upload error:",
          uploadError
        );

        alert(
          "Could not upload profile image."
        );

        return;
      }


      nextImagePath =
        uploadedImagePath;
    }


    const profileUpdates = {
      display_name: displayName,
      bio: description,
      specialty,
      image_path: nextImagePath,
      terminal_title: terminalTitle,
      github_url: githubURL || null,
      linkedin_url: linkedinURL || null,
      public_email: publicEmail || null,
      social_links: socialLinks,
      github_username: githubUsername || null,
      primary_link_key: primaryLinkKey || null,
      tech_stack: techStack
    };


    if (portfolioThemeDatabaseReady) {
      profileUpdates.portfolio_theme =
        portfolioTheme;
    }


    const { error } =
      await supabaseClient
        .from("profiles")
        .update(profileUpdates)
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "Profile save error:",
        error
      );


      if (uploadedImagePath) {

        await supabaseClient
          .storage
          .from(
            "portfolio-files"
          )
          .remove([
            uploadedImagePath
          ]);

      }


      alert(
        "Could not save profile."
      );

      return;
    }


    if (
      previousImagePath
      &&
      previousImagePath
      !==
      nextImagePath
    ) {

      const {
        error: removeError
      } =
        await supabaseClient
          .storage
          .from(
            "portfolio-files"
          )
          .remove([
            previousImagePath
          ]);


      if (removeError) {

        console.warn(
          "Old profile image cleanup error:",
          removeError
        );

      }
    }


    currentProfile = {
      ...currentProfile,

      display_name:
        displayName,

      bio: description,

      specialty,

      description,

      image_path:
        nextImagePath,

      terminal_title:
        terminalTitle,

      github_url:
        githubURL || null,

      linkedin_url:
        linkedinURL || null,

      public_email:
        publicEmail || null,

      social_links:
        socialLinks,

      github_username:
        githubUsername || null,

      primary_link_key:
        primaryLinkKey || null,

      tech_stack:
        techStack,

      ...(portfolioThemeDatabaseReady
        ? { portfolio_theme: portfolioTheme }
        : {})
    };


    signedInProfile = {
      ...currentProfile
    };


    renderProfile();

    await loadGitHubHighlights();

    closeProfileEditor();
  }


  function removeProfileImage() {

    temporaryProfileFile =
      null;

    removeProfileImageRequested =
      true;


    resetProfilePreview();


    document
      .getElementById(
        "profileImageInput"
      )
      .value =
      "";
  }


  /* =========================================
     PROJECTS + LABS - SUPABASE
  ========================================= */

  let portfolioItems = [];

  let editingItemId = null;
  let editingItemType = null;


  /* =========================================
     LOAD FROM SUPABASE
  ========================================= */

  async function loadPortfolioItems() {

    const {
      data: projects,
      error: projectsError
    } =
      await supabaseClient
        .from("projects")
        .select("*")
        .eq(
          "user_id",
          activePortfolioUserId
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    const {
      data: labs,
      error: labsError
    } =
      await supabaseClient
        .from("labs")
        .select("*")
        .eq(
          "user_id",
          activePortfolioUserId
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (
      projectsError
      ||
      labsError
    ) {

      console.error(
        "Portfolio loading error:",
        projectsError,
        labsError
      );

      return;
    }


    portfolioItems = [

      ...(projects || []).map(
        item => ({
          ...item,
          type: "project"
        })
      ),

      ...(labs || []).map(
        item => ({
          ...item,
          type: "lab"
        })
      )

    ];


    updatePortfolioStatCounts();


    displayPortfolioItems();
    updatePortfolioCompletion();
  }


  /* =========================================
     DISPLAY
  ========================================= */

  function displayPortfolioItems() {

    displayItemType(
      "project",
      "projectsGrid",
      "projectsEmpty"
    );


    displayItemType(
      "lab",
      "labsGrid",
      "labsEmpty"
    );
  }


  function getPortfolioItemIcon(
    item,
    type
  ) {

    const searchableText = [
      item.title || "",
      ...(Array.isArray(item.tags)
        ? item.tags
        : [])
    ]
      .join(" ")
      .toLowerCase();


    const iconRules = [
      {
        keywords: [
          "cyber",
          "security",
          "hack",
          "ctf",
          "owasp"
        ],
        icon: "🛡️"
      },
      {
        keywords: [
          "linux",
          "kali",
          "bash",
          "shell"
        ],
        icon: "🐧"
      },
      {
        keywords: [
          "network",
          "wireshark",
          "tcp",
          "packet"
        ],
        icon: "🌐"
      },
      {
        keywords: [
          "python"
        ],
        icon: "🐍"
      },
      {
        keywords: [
          "java"
        ],
        icon: "☕"
      },
      {
        keywords: [
          "javascript",
          "html",
          "css",
          "web",
          "php"
        ],
        icon: "🧩"
      },
      {
        keywords: [
          "database",
          "sql",
          "supabase"
        ],
        icon: "🗄️"
      }
    ];


    const match =
      iconRules.find(
        rule =>
          rule.keywords.some(
            keyword =>
              searchableText.includes(
                keyword
              )
          )
      );


    return match?.icon
      ||
      (
        type === "lab"
          ?
          "🧪"
          :
          "💻"
      );
  }


  /* =========================================
     DISPLAY TYPE
  ========================================= */

  function displayItemType(
    type,
    containerId,
    emptyId
  ) {

    const container =
      document.getElementById(
        containerId
      );


    const empty =
      document.getElementById(
        emptyId
      );


    container.innerHTML = "";


    const items =
      portfolioItems.filter(
        item =>
          item.type === type
      );


    if (
      items.length === 0
    ) {

      empty.style.display =
        "block";

      return;
    }


    empty.style.display =
      "none";


    items.forEach(
      item => {


        const card =
          document.createElement(
            "div"
          );


        card.className =
          "project-card";


        const tags =
          Array.isArray(
            item.tags
          )
            ?
            item.tags
            :
            [];


        const tagsHTML =
          tags
            .map(
              tag =>
                `
                            <span class="tag">
                                ${escapeHTML(tag)}
                            </span>
                            `
            )
            .join("");


        const link =
          safeHttpUrl(
            item.link
          );


        const linkHTML =
          link
            ?
            `
                    <a
                        href="${link}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="project-card-link"
                    >
                        ${
              type === "project"
                ?
                "View Project ↗"
                :
                "View Lab ↗"
            }
                    </a>
                    `
            :
            "";


        const previewTools =
          tags
            .slice(0, 3)
            .join(" • ");


        card.innerHTML = `

                <div class="item-card-actions admin-only">

                    <button
                        type="button"
                        class="edit-item-btn"
                        onclick="editPortfolioItem('${item.id}')"
                        title="Edit"
                    >
                        ✎
                    </button>


                    <button
                        type="button"
                        class="delete-item-btn"
                        onclick="deletePortfolioItem(
                            '${item.id}',
                            '${item.type}'
                        )"
                        title="Delete"
                    >
                        ✕
                    </button>

                </div>


                <div class="project-card-heading">

                    <div
                        class="project-card-icon"
                        aria-hidden="true"
                    >
                        ${getPortfolioItemIcon(
                          item,
                          type
                        )}
                    </div>


                    <div class="project-title">
                        ${escapeHTML(item.title)}
                    </div>

                </div>


                <p>
                    ${escapeHTML(item.description)}
                </p>


                ${
          tagsHTML
            ?
            `
                        <div class="tags">
                            ${tagsHTML}
                        </div>
                        `
            :
            ""
        }


                <div class="project-card-footer">
                  ${linkHTML}


                  ${
                    type === "project"
                      ?
                      `<span
                        class="content-view-count"
                        data-view-key="project:${item.id}"
                      >
                        ${formatContentViewCount(
                          getContentViewCount(
                            "project",
                            item.id
                          )
                        )}
                      </span>`
                      :
                      ""
                  }
                </div>


                <div
                    class="project-hover-preview"
                    aria-hidden="true"
                >
                    <span class="project-hover-label">
                        Quick Preview
                    </span>

                    <p>
                        ${escapeHTML(item.description)}
                    </p>

                    ${
                      previewTools
                        ?
                        `<span class="project-hover-tools">
                          ${escapeHTML(previewTools)}
                        </span>`
                        :
                        ""
                    }
                </div>

            `;


        container.appendChild(
          card
        );


        observeRevealElement(
          card
        );


        if (type === "project") {

          trackContentView(
            card,
            "project",
            item.id
          );

        }

      }
    );
  }


  /* =========================================
     OPEN ADD WINDOW
  ========================================= */

  function openItemEditor(type) {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    editingItemId =
      null;


    editingItemType =
      type;


    document
      .getElementById(
        "itemModalTitle"
      )
      .textContent =
      type === "project"
        ?
        "Add Project"
        :
        "Add Lab";


    document
      .getElementById(
        "itemTitle"
      )
      .value =
      "";


    document
      .getElementById(
        "itemDescription"
      )
      .value =
      "";


    document
      .getElementById(
        "itemTags"
      )
      .value =
      "";


    document
      .getElementById(
        "itemLink"
      )
      .value =
      "";


    document
      .getElementById(
        "itemModal"
      )
      .style.display =
      "flex";
  }


  /* =========================================
     EDIT
  ========================================= */

  function editPortfolioItem(id) {

    if (!isAdmin) {
      return;
    }


    const item =
      portfolioItems.find(
        item =>
          item.id === id
      );


    if (!item) {
      return;
    }


    editingItemId =
      item.id;


    editingItemType =
      item.type;


    document
      .getElementById(
        "itemModalTitle"
      )
      .textContent =
      item.type === "project"
        ?
        "Edit Project"
        :
        "Edit Lab";


    document
      .getElementById(
        "itemTitle"
      )
      .value =
      item.title || "";


    document
      .getElementById(
        "itemDescription"
      )
      .value =
      item.description || "";


    document
      .getElementById(
        "itemTags"
      )
      .value =
      Array.isArray(item.tags)
        ?
        item.tags.join(", ")
        :
        "";


    document
      .getElementById(
        "itemLink"
      )
      .value =
      item.link || "";


    document
      .getElementById(
        "itemModal"
      )
      .style.display =
      "flex";
  }


  /* =========================================
     SAVE / UPDATE
  ========================================= */

  async function saveItem() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    const title =
      document
        .getElementById(
          "itemTitle"
        )
        .value
        .trim();


    const description =
      document
        .getElementById(
          "itemDescription"
        )
        .value
        .trim();


    const tagsText =
      document
        .getElementById(
          "itemTags"
        )
        .value
        .trim();


    const link =
      document
        .getElementById(
          "itemLink"
        )
        .value
        .trim();


    if (!title) {

      alert(
        "Enter a name."
      );

      return;
    }


    if (!description) {

      alert(
        "Enter a description."
      );

      return;
    }


    if (
      link
      &&
      !safeHttpUrl(link)
    ) {

      alert(
        "Link must start with http:// or https://"
      );

      return;
    }


    const tags =
      tagsText
        ?
        tagsText
          .split(",")
          .map(
            tag =>
              tag.trim()
          )
          .filter(Boolean)
        :
        [];


    const table =
      editingItemType === "project"
        ?
        "projects"
        :
        "labs";


    let error;


    /* UPDATE */

    if (editingItemId) {

      const result =
        await supabaseClient
          .from(table)
          .update({

            title,

            description,

            tags,

            link:
              link || null

          })
          .eq(
            "id",
            editingItemId
          )
          .eq(
            "user_id",
            currentUser.id
          );


      error =
        result.error;

    }


    /* ADD */

    else {

      const result =
        await supabaseClient
          .from(table)
          .insert({

            user_id:
              currentUser.id,

            title,

            description,

            tags,

            link:
              link || null

          });


      error =
        result.error;

    }


    if (error) {

      console.error(
        "Save error:",
        error
      );


      alert(
        "Could not save item."
      );

      return;
    }


    closeItemEditor();


    await loadPortfolioItems();
  }


  /* =========================================
     DELETE
  ========================================= */

  async function deletePortfolioItem(
    id,
    type
  ) {

    if (!isAdmin) {
      return;
    }


    const confirmed =
      confirm(
        "Delete this item?"
      );


    if (!confirmed) {
      return;
    }


    const table =
      type === "project"
        ?
        "projects"
        :
        "labs";


    const {
      error
    } =
      await supabaseClient
        .from(table)
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "Delete error:",
        error
      );


      alert(
        "Could not delete item."
      );

      return;
    }


    await loadPortfolioItems();
  }


  /* =========================================
     CLOSE
  ========================================= */

  function closeItemEditor() {

    document
      .getElementById(
        "itemModal"
      )
      .style.display =
      "none";


    editingItemId =
      null;


    editingItemType =
      null;
  }


  /* =========================================
     START
  ========================================= */

  /* =========================================
     LEARNING LOG - SUPABASE
  ========================================= */

  let learningPosts = [];

  const LEARNING_LOG_VISIBLE_COUNT = 3;

  let learningLogExpanded = false;

  let learningLogOwner = null;

  let editingLearningPostId = null;


  async function loadLearningPosts() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("learning_posts")
        .select(
          "id, content, tags, post_date, created_at, updated_at"
        )
        .eq(
          "user_id",
          activePortfolioUserId
        )
        .order(
          "post_date",
          {
            ascending: false
          }
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Learning posts loading error:",
        error
      );

      return;
    }


    learningPosts =
      data || [];

    if (learningLogOwner !== activePortfolioUserId) {
      learningLogExpanded = false;
      learningLogOwner = activePortfolioUserId;
    }

    if (window.location.hash.startsWith("#learning-post-")) {
      learningLogExpanded = true;
    }


    displayLearningPosts();
    updatePortfolioCompletion();
  }


  function formatLearningPostDate(
    value
  ) {

    if (!value) {
      return "";
    }


    const date =
      new Date(
        value + "T00:00:00Z"
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;
    }


    return new Intl.DateTimeFormat(
      "en",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
      }
    ).format(date);
  }


  function displayLearningPosts() {

    const container =
      document.getElementById(
        "learningPostsGrid"
      );


    const empty =
      document.getElementById(
        "learningPostsEmpty"
      );


    container.innerHTML = "";


    if (
      learningPosts.length === 0
    ) {

      empty.style.display =
        "block";

      return;
    }


    empty.style.display =
      "none";


    const disclosure =
      document.getElementById(
        "learningLogDisclosure"
      );

    const toggle =
      document.getElementById(
        "learningLogToggle"
      );

    const hiddenCount = Math.max(
      0,
      learningPosts.length
      - LEARNING_LOG_VISIBLE_COUNT
    );

    if (disclosure && toggle) {
      disclosure.hidden = hiddenCount === 0;
      toggle.setAttribute(
        "aria-expanded",
        String(learningLogExpanded)
      );

      document.getElementById(
        "learningLogToggleLabel"
      ).textContent = learningLogExpanded
        ? "Hide older posts"
        : "Show older posts";

      document.getElementById(
        "learningLogToggleCount"
      ).textContent = hiddenCount
        ? `${hiddenCount} older`
        : "";
    }

    const visibleLearningPosts =
      learningLogExpanded
        ? learningPosts
        : learningPosts.slice(
            0,
            LEARNING_LOG_VISIBLE_COUNT
          );

    visibleLearningPosts.forEach(
      post => {

        const card =
          document.createElement(
            "article"
          );


        card.className =
          "learning-post-card";


        card.id =
          `learning-post-${post.id}`;


        const tags =
          Array.isArray(
            post.tags
          )
            ?
            post.tags
            :
            [];


        const tagsHTML =
          tags
            .map(
              tag =>
                `
                  <span class="tag">
                    ${escapeHTML(tag)}
                  </span>
                `
            )
            .join("");


        const postDate =
          post.post_date || "";


        card.innerHTML = `

          <div class="learning-post-actions admin-only">

            <button
              type="button"
              class="edit-item-btn"
              onclick="editLearningPost('${post.id}')"
              title="Edit"
            >
              ✎
            </button>


            <button
              type="button"
              class="delete-item-btn"
              onclick="deleteLearningPost('${post.id}')"
              title="Delete"
            >
              ✕
            </button>

          </div>


          <p class="learning-post-content">${escapeHTML(
            post.content
          )}</p>


          <div class="learning-post-footer">

            <div class="learning-post-tags">
              ${tagsHTML}
            </div>


            <div class="learning-post-meta">

              <time
                class="learning-post-date"
                datetime="${escapeHTML(postDate)}"
              >
                ${escapeHTML(
                  formatLearningPostDate(
                    postDate
                  )
                )}
              </time>


              <span
                class="content-view-count"
                data-view-key="learning_post:${post.id}"
              >
                ${formatContentViewCount(
                  getContentViewCount(
                    "learning_post",
                    post.id
                  )
                )}
              </span>


              <button
                type="button"
                class="learning-post-share"
                onclick="copyLearningPostLink('${post.id}', this)"
                title="Copy direct link"
              >
                🔗 Share
              </button>

            </div>

          </div>

        `;


        container.appendChild(
          card
        );


        observeRevealElement(
          card
        );


        trackContentView(
          card,
          "learning_post",
          post.id
        );
      }
    );


    focusLearningPostFromHash();
  }


  function toggleOlderLearningPosts() {

    learningLogExpanded =
      !learningLogExpanded;

    displayLearningPosts();

    if (!learningLogExpanded) {
      document.getElementById(
        "learning-log"
      )?.scrollIntoView({
        behavior:
          window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches
            ? "auto"
            : "smooth",
        block: "start"
      });
    }
  }


  async function copyLearningPostLink(
    postId,
    button
  ) {

    const baseURL =
      buildPortfolioURL(
        activePortfolioUsername
      );


    const postURL =
      `${baseURL}#learning-post-${postId}`;


    let copied = false;


    try {

      if (
        navigator.clipboard
        &&
        window.isSecureContext
      ) {

        await navigator.clipboard
          .writeText(postURL);

        copied = true;

      }

      else {

        const temporaryInput =
          document.createElement(
            "textarea"
          );


        temporaryInput.value =
          postURL;


        temporaryInput.setAttribute(
          "readonly",
          ""
        );


        temporaryInput.style.position =
          "fixed";


        temporaryInput.style.opacity =
          "0";


        document.body.appendChild(
          temporaryInput
        );


        temporaryInput.select();


        copied =
          document.execCommand(
            "copy"
          );


        temporaryInput.remove();

      }

    }

    catch (error) {

      console.error(
        "Learning post link copy error:",
        error
      );

    }


    if (!button) {
      return;
    }


    const originalText =
      button.textContent;


    button.textContent =
      copied
        ?
        "✓ Copied"
        :
        "Copy failed";


    button.classList.toggle(
      "copied",
      copied
    );


    window.setTimeout(
      () => {

        button.textContent =
          originalText;


        button.classList.remove(
          "copied"
        );

      },
      1800
    );
  }


  function focusLearningPostFromHash() {

    if (
      !window.location.hash
        .startsWith(
          "#learning-post-"
        )
    ) {

      return;
    }


    const card =
      document.getElementById(
        window.location.hash.slice(1)
      );


    if (!card) {
      return;
    }


    window.setTimeout(
      () => {

        card.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });


        card.classList.add(
          "linked-post"
        );


        window.setTimeout(
          () => {

            card.classList.remove(
              "linked-post"
            );

          },
          2400
        );

      },
      100
    );
  }


  window.addEventListener(
    "hashchange",
    focusLearningPostFromHash
  );


  function openLearningPostEditor() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    editingLearningPostId =
      null;


    const now =
      new Date();


    const localDate =
      new Date(
        now.getTime()
        -
        now.getTimezoneOffset()
        *
        60000
      )
        .toISOString()
        .slice(0, 10);


    document
      .getElementById(
        "learningPostModalTitle"
      )
      .textContent =
      "New Learning Post";


    document
      .getElementById(
        "learningPostContent"
      )
      .value =
      "";


    document
      .getElementById(
        "learningPostDate"
      )
      .value =
      localDate;


    document
      .getElementById(
        "learningPostTags"
      )
      .value =
      "";


    document
      .getElementById(
        "learningPostModal"
      )
      .style.display =
      "flex";


    document
      .getElementById(
        "learningPostContent"
      )
      .focus();
  }


  function editLearningPost(id) {

    if (!isAdmin) {
      return;
    }


    const post =
      learningPosts.find(
        item =>
          item.id === id
      );


    if (!post) {
      return;
    }


    editingLearningPostId =
      post.id;


    document
      .getElementById(
        "learningPostModalTitle"
      )
      .textContent =
      "Edit Learning Post";


    document
      .getElementById(
        "learningPostContent"
      )
      .value =
      post.content || "";


    document
      .getElementById(
        "learningPostDate"
      )
      .value =
      post.post_date || "";


    document
      .getElementById(
        "learningPostTags"
      )
      .value =
      Array.isArray(post.tags)
        ?
        post.tags.join(", ")
        :
        "";


    document
      .getElementById(
        "learningPostModal"
      )
      .style.display =
      "flex";


    document
      .getElementById(
        "learningPostContent"
      )
      .focus();
  }


  async function saveLearningPost() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    const content =
      document
        .getElementById(
          "learningPostContent"
        )
        .value
        .trim();


    const postDate =
      document
        .getElementById(
          "learningPostDate"
        )
        .value;


    const tagsText =
      document
        .getElementById(
          "learningPostTags"
        )
        .value
        .trim();


    if (!content) {

      alert(
        "Write something you learned."
      );

      return;
    }


    if (
      content.length > 1000
    ) {

      alert(
        "Post must be 1000 characters or less."
      );

      return;
    }


    if (!postDate) {

      alert(
        "Choose a date."
      );

      return;
    }


    const tags =
      tagsText
        ?
        [
          ...new Set(
            tagsText
              .split(",")
              .map(
                tag =>
                  tag.trim()
              )
              .filter(Boolean)
          )
        ]
        :
        [];


    const postData = {
      user_id:
        currentUser.id,
      content,
      tags,
      post_date:
        postDate
    };


    const result =
      editingLearningPostId
        ?
        await supabaseClient
          .from("learning_posts")
          .update(postData)
          .eq(
            "id",
            editingLearningPostId
          )
          .eq(
            "user_id",
            currentUser.id
          )
        :
        await supabaseClient
          .from("learning_posts")
          .insert(postData);


    if (result.error) {

      console.error(
        "Learning post save error:",
        result.error
      );


      alert(
        "Could not save learning post."
      );

      return;
    }


    closeLearningPostEditor();

    await loadLearningPosts();
  }


  async function deleteLearningPost(id) {

    if (!isAdmin) {
      return;
    }


    const confirmed =
      confirm(
        "Delete this learning post?"
      );


    if (!confirmed) {
      return;
    }


    const { error } =
      await supabaseClient
        .from("learning_posts")
        .delete()
        .eq("id", id)
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "Learning post delete error:",
        error
      );


      alert(
        "Could not delete learning post."
      );

      return;
    }


    await loadLearningPosts();
  }


  function closeLearningPostEditor() {

    document
      .getElementById(
        "learningPostModal"
      )
      .style.display =
      "none";


    editingLearningPostId =
      null;
  }


  /* =========================================
     CURRENTLY LEARNING - SUPABASE
  ========================================= */

  let currentLearningItems = [];

  let editingCurrentLearningId = null;


  async function loadCurrentLearningItems() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("currently_learning")
        .select(
          "id, title, description, status, tags, sort_order, created_at, updated_at"
        )
        .eq(
          "user_id",
          activePortfolioUserId
        )
        .order(
          "sort_order",
          {
            ascending: true
          }
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Currently learning loading error:",
        error
      );

      return;
    }


    currentLearningItems =
      data || [];


    displayCurrentLearningItems();
  }


  function getCurrentLearningIcon(
    item
  ) {

    const icon =
      getPortfolioItemIcon(
        item,
        "project"
      );


    return icon === "💻"
      ?
      "📚"
      :
      icon;
  }


  function displayCurrentLearningItems() {

    const container =
      document.getElementById(
        "currentlyLearningGrid"
      );


    const empty =
      document.getElementById(
        "currentlyLearningEmpty"
      );


    container.innerHTML = "";


    if (
      currentLearningItems.length
      ===
      0
    ) {

      empty.style.display =
        "block";

      return;
    }


    empty.style.display =
      "none";


    currentLearningItems.forEach(
      item => {

        const card =
          document.createElement(
            "article"
          );


        card.className =
          "currently-learning-card";


        const tags =
          Array.isArray(item.tags)
            ?
            item.tags
            :
            [];


        const tagsHTML =
          tags
            .map(
              tag =>
                `
                  <span class="tag">
                    ${escapeHTML(tag)}
                  </span>
                `
            )
            .join("");


        card.innerHTML = `

          <div class="item-card-actions admin-only">

            <button
              type="button"
              class="edit-item-btn"
              onclick="editCurrentLearningItem('${item.id}')"
              title="Edit"
            >
              ✎
            </button>


            <button
              type="button"
              class="delete-item-btn"
              onclick="deleteCurrentLearningItem('${item.id}')"
              title="Delete"
            >
              ✕
            </button>

          </div>


          <div
            class="currently-learning-icon"
            aria-hidden="true"
          >
            ${getCurrentLearningIcon(item)}
          </div>


          <div class="currently-learning-status">
            ${escapeHTML(
              item.status || "In Progress"
            )}
          </div>


          <h3>
            ${escapeHTML(item.title)}
          </h3>


          <p class="currently-learning-description">
            ${escapeHTML(item.description || "")}
          </p>


          ${
            tagsHTML
              ?
              `
                <div class="tags">
                  ${tagsHTML}
                </div>
              `
              :
              ""
          }

        `;


        container.appendChild(
          card
        );


        observeRevealElement(
          card
        );
      }
    );
  }


  function openCurrentLearningEditor() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    editingCurrentLearningId =
      null;


    document
      .getElementById(
        "currentLearningModalTitle"
      )
      .textContent =
      "Add Learning Focus";


    document
      .getElementById(
        "currentLearningTitle"
      )
      .value = "";


    document
      .getElementById(
        "currentLearningDescription"
      )
      .value = "";


    document
      .getElementById(
        "currentLearningStatus"
      )
      .value =
      "In Progress";


    document
      .getElementById(
        "currentLearningTags"
      )
      .value = "";


    document
      .getElementById(
        "currentLearningModal"
      )
      .style.display =
      "flex";


    document
      .getElementById(
        "currentLearningTitle"
      )
      .focus();
  }


  function editCurrentLearningItem(id) {

    if (!isAdmin) {
      return;
    }


    const item =
      currentLearningItems.find(
        currentItem =>
          currentItem.id === id
      );


    if (!item) {
      return;
    }


    editingCurrentLearningId =
      item.id;


    document
      .getElementById(
        "currentLearningModalTitle"
      )
      .textContent =
      "Edit Learning Focus";


    document
      .getElementById(
        "currentLearningTitle"
      )
      .value =
      item.title || "";


    document
      .getElementById(
        "currentLearningDescription"
      )
      .value =
      item.description || "";


    document
      .getElementById(
        "currentLearningStatus"
      )
      .value =
      item.status || "In Progress";


    document
      .getElementById(
        "currentLearningTags"
      )
      .value =
      Array.isArray(item.tags)
        ?
        item.tags.join(", ")
        :
        "";


    document
      .getElementById(
        "currentLearningModal"
      )
      .style.display =
      "flex";


    document
      .getElementById(
        "currentLearningTitle"
      )
      .focus();
  }


  async function saveCurrentLearningItem() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    const title =
      document
        .getElementById(
          "currentLearningTitle"
        )
        .value
        .trim();


    const description =
      document
        .getElementById(
          "currentLearningDescription"
        )
        .value
        .trim();


    const status =
      document
        .getElementById(
          "currentLearningStatus"
        )
        .value;


    const tags =
      document
        .getElementById(
          "currentLearningTags"
        )
        .value
        .split(",")
        .map(
          tag =>
            tag.trim()
        )
        .filter(Boolean);


    if (!title) {

      alert(
        "Enter a learning topic."
      );

      return;
    }


    if (!description) {

      alert(
        "Enter a short description."
      );

      return;
    }


    let result;


    if (editingCurrentLearningId) {

      result =
        await supabaseClient
          .from("currently_learning")
          .update({
            title,
            description,
            status,
            tags
          })
          .eq(
            "id",
            editingCurrentLearningId
          )
          .eq(
            "user_id",
            currentUser.id
          );

    }

    else {

      const nextSortOrder =
        currentLearningItems.reduce(
          (
            highest,
            item
          ) =>
            Math.max(
              highest,
              Number(item.sort_order)
              ||
              0
            ),
          0
        ) + 1;


      result =
        await supabaseClient
          .from("currently_learning")
          .insert({
            user_id:
              currentUser.id,
            title,
            description,
            status,
            tags,
            sort_order:
              nextSortOrder
          });

    }


    if (result.error) {

      console.error(
        "Currently learning save error:",
        result.error
      );


      alert(
        "Could not save learning focus."
      );

      return;
    }


    closeCurrentLearningEditor();

    await loadCurrentLearningItems();
  }


  async function deleteCurrentLearningItem(
    id
  ) {

    if (!isAdmin) {
      return;
    }


    const confirmed =
      confirm(
        "Delete this learning focus?"
      );


    if (!confirmed) {
      return;
    }


    const { error } =
      await supabaseClient
        .from("currently_learning")
        .delete()
        .eq("id", id)
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "Currently learning delete error:",
        error
      );


      alert(
        "Could not delete learning focus."
      );

      return;
    }


    await loadCurrentLearningItems();
  }


  function closeCurrentLearningEditor() {

    document
      .getElementById(
        "currentLearningModal"
      )
      .style.display =
      "none";


    editingCurrentLearningId =
      null;
  }


  /* =========================================
     GROWTH HUB - SUPABASE
  ========================================= */

  let growthItems = [];
  let editingGrowthItemId = null;
  let editingGrowthItemType = null;


  async function loadGrowthItems() {

    const { data, error } =
      await supabaseClient
        .from("growth_items")
        .select(
          "id, item_type, title, description, status, link, sort_order, created_at, updated_at"
        )
        .eq(
          "user_id",
          activePortfolioUserId
        )
        .order(
          "sort_order",
          {
            ascending: true
          }
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Growth Hub loading error:",
        error
      );

      return;
    }


    growthItems = data || [];

    displayGrowthItems();
  }


  function normalizeGrowthStatus(value) {

    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }


  function growthItemActionsHTML(item) {

    return `
      <div class="item-card-actions admin-only">

        <button
          type="button"
          class="edit-item-btn"
          onclick="editGrowthItem('${item.id}')"
          title="Edit"
        >
          ✎
        </button>


        <button
          type="button"
          class="delete-item-btn"
          onclick="deleteGrowthItem('${item.id}')"
          title="Delete"
        >
          ✕
        </button>

      </div>
    `;
  }


  function displayGrowthItems() {

    displayRoadmapItems();
    displayMonthlyGoals();
    displayResources();
  }


  function displayRoadmapItems() {

    const container =
      document.getElementById(
        "roadmapList"
      );


    const empty =
      document.getElementById(
        "roadmapEmpty"
      );


    const items =
      growthItems.filter(
        item =>
          item.item_type === "roadmap"
      );


    container.innerHTML = "";

    empty.style.display =
      items.length === 0
        ?
        "block"
        :
        "none";


    items.forEach(
      item => {

        const element =
          document.createElement(
            "article"
          );


        element.className =
          "roadmap-item";


        element.dataset.status =
          normalizeGrowthStatus(
            item.status
          );


        const link =
          safeHttpUrl(item.link);


        element.innerHTML = `
          <div
            class="roadmap-dot"
            aria-hidden="true"
          ></div>

          <div class="roadmap-content">
            ${growthItemActionsHTML(item)}

            <h4>${escapeHTML(item.title)}</h4>

            <p>${escapeHTML(item.description || "")}</p>

            <span class="growth-status">
              ${escapeHTML(item.status || "Next")}
            </span>

            ${
              link
                ?
                `<a
                  href="${link}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="resource-link"
                >
                  Open link ↗
                </a>`
                :
                ""
            }
          </div>
        `;


        container.appendChild(
          element
        );

        observeRevealElement(
          element
        );
      }
    );
  }


  function displayMonthlyGoals() {

    const container =
      document.getElementById(
        "monthlyGoalsGrid"
      );


    const empty =
      document.getElementById(
        "monthlyGoalsEmpty"
      );


    const items =
      growthItems.filter(
        item =>
          item.item_type === "goal"
      );


    container.innerHTML = "";

    empty.style.display =
      items.length === 0
        ?
        "block"
        :
        "none";


    items.forEach(
      item => {

        const card =
          document.createElement(
            "article"
          );


        const status =
          normalizeGrowthStatus(
            item.status
          );


        card.className =
          "goal-card";

        card.dataset.status = status;


        card.innerHTML = `
          ${growthItemActionsHTML(item)}

          <span
            class="goal-state-icon"
            aria-hidden="true"
          >
            ${status === "done" ? "✓" : "•"}
          </span>

          <h4>${escapeHTML(item.title)}</h4>

          <p>${escapeHTML(item.description || "")}</p>

          <span class="growth-status">
            ${escapeHTML(item.status || "Planned")}
          </span>
        `;


        container.appendChild(card);

        observeRevealElement(card);
      }
    );
  }


  function displayResources() {

    const container =
      document.getElementById(
        "resourcesGrid"
      );


    const empty =
      document.getElementById(
        "resourcesEmpty"
      );


    const items =
      growthItems.filter(
        item =>
          item.item_type === "resource"
      );


    container.innerHTML = "";

    empty.style.display =
      items.length === 0
        ?
        "block"
        :
        "none";


    items.forEach(
      item => {

        const card =
          document.createElement(
            "article"
          );


        const link =
          safeHttpUrl(item.link);


        card.className =
          "resource-card";


        card.innerHTML = `
          ${growthItemActionsHTML(item)}

          <span class="growth-status">
            ${escapeHTML(item.status || "Resource")}
          </span>

          <h4>${escapeHTML(item.title)}</h4>

          <p>${escapeHTML(item.description || "")}</p>

          ${
            link
              ?
              `<a
                href="${link}"
                target="_blank"
                rel="noopener noreferrer"
                class="resource-link"
              >
                Visit resource ↗
              </a>`
              :
              ""
          }
        `;


        container.appendChild(card);

        observeRevealElement(card);
      }
    );
  }


  function setGrowthStatusOptions(
    type,
    selectedValue = ""
  ) {

    const optionsByType = {
      roadmap: [
        "Completed",
        "Current",
        "Next"
      ],
      goal: [
        "Planned",
        "In Progress",
        "Done"
      ],
      resource: [
        "Book",
        "Channel",
        "Website",
        "Course"
      ]
    };


    const select =
      document.getElementById(
        "growthItemStatus"
      );


    select.innerHTML = "";


    (optionsByType[type] || [])
      .forEach(
        value => {

          const option =
            document.createElement(
              "option"
            );


          option.value = value;
          option.textContent = value;

          select.appendChild(option);
        }
      );


    if (selectedValue) {
      select.value = selectedValue;
    }
  }


  function openGrowthItemEditor(type) {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    const labels = {
      roadmap: "Roadmap Step",
      goal: "Monthly Goal",
      resource: "Resource"
    };


    editingGrowthItemId = null;
    editingGrowthItemType = type;


    document
      .getElementById(
        "growthItemModalTitle"
      )
      .textContent =
      `Add ${labels[type] || "Item"}`;


    document
      .getElementById(
        "growthItemTitle"
      )
      .value = "";


    document
      .getElementById(
        "growthItemDescription"
      )
      .value = "";


    document
      .getElementById(
        "growthItemLink"
      )
      .value = "";


    setGrowthStatusOptions(type);


    document
      .getElementById(
        "growthItemModal"
      )
      .style.display = "flex";


    document
      .getElementById(
        "growthItemTitle"
      )
      .focus();
  }


  function editGrowthItem(id) {

    if (!isAdmin) {
      return;
    }


    const item =
      growthItems.find(
        growthItem =>
          growthItem.id === id
      );


    if (!item) {
      return;
    }


    editingGrowthItemId = item.id;
    editingGrowthItemType = item.item_type;


    document
      .getElementById(
        "growthItemModalTitle"
      )
      .textContent =
      "Edit Growth Item";


    document
      .getElementById(
        "growthItemTitle"
      )
      .value = item.title || "";


    document
      .getElementById(
        "growthItemDescription"
      )
      .value = item.description || "";


    document
      .getElementById(
        "growthItemLink"
      )
      .value = item.link || "";


    setGrowthStatusOptions(
      item.item_type,
      item.status
    );


    document
      .getElementById(
        "growthItemModal"
      )
      .style.display = "flex";


    document
      .getElementById(
        "growthItemTitle"
      )
      .focus();
  }


  async function saveGrowthItem() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    const title =
      document
        .getElementById(
          "growthItemTitle"
        )
        .value
        .trim();


    const description =
      document
        .getElementById(
          "growthItemDescription"
        )
        .value
        .trim();


    const status =
      document
        .getElementById(
          "growthItemStatus"
        )
        .value;


    const rawLink =
      document
        .getElementById(
          "growthItemLink"
        )
        .value
        .trim();


    const link =
      rawLink
        ?
        safeHttpUrl(rawLink)
        :
        "";


    if (!title || !description) {

      alert(
        "Enter a title and description."
      );

      return;
    }


    if (
      rawLink
      &&
      !link
    ) {

      alert(
        "Enter a valid http or https link."
      );

      return;
    }


    if (
      editingGrowthItemType
      ===
      "resource"
      &&
      !link
    ) {

      alert(
        "Add a link for this resource."
      );

      return;
    }


    const payload = {
      user_id:
        currentUser.id,
      item_type:
        editingGrowthItemType,
      title,
      description,
      status,
      link: link || null
    };


    let result;


    if (editingGrowthItemId) {

      result =
        await supabaseClient
          .from("growth_items")
          .update(payload)
          .eq(
            "id",
            editingGrowthItemId
          )
          .eq(
            "user_id",
            currentUser.id
          );

    }

    else {

      payload.sort_order =
        growthItems
          .filter(
            item =>
              item.item_type
              ===
              editingGrowthItemType
          )
          .reduce(
            (
              highest,
              item
            ) =>
              Math.max(
                highest,
                Number(item.sort_order)
                ||
                0
              ),
            0
          ) + 1;


      result =
        await supabaseClient
          .from("growth_items")
          .insert(payload);

    }


    if (result.error) {

      console.error(
        "Growth Hub save error:",
        result.error
      );

      alert(
        "Could not save this item."
      );

      return;
    }


    closeGrowthItemEditor();

    await loadGrowthItems();
  }


  async function deleteGrowthItem(id) {

    if (!isAdmin) {
      return;
    }


    const confirmed =
      confirm(
        "Delete this item?"
      );


    if (!confirmed) {
      return;
    }


    const { error } =
      await supabaseClient
        .from("growth_items")
        .delete()
        .eq("id", id)
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "Growth Hub delete error:",
        error
      );

      alert(
        "Could not delete this item."
      );

      return;
    }


    await loadGrowthItems();
  }


  function closeGrowthItemEditor() {

    document
      .getElementById(
        "growthItemModal"
      )
      .style.display = "none";


    editingGrowthItemId = null;
    editingGrowthItemType = null;
  }


  /* =========================================
     KNOWLEDGE BASE - SUPABASE
  ========================================= */

  let knowledgeSections = [];

  let editingKnowledgeSectionId = null;


  async function loadKnowledgeSections() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("knowledge_sections")
        .select(
          "id, title, items, sort_order, created_at, updated_at"
        )
        .eq(
          "user_id",
          activePortfolioUserId
        )
        .order(
          "sort_order",
          {
            ascending: true
          }
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Knowledge Base loading error:",
        error
      );

      return;
    }


    knowledgeSections =
      data || [];


    displayKnowledgeSections();
  }


  function displayKnowledgeSections() {

    const container =
      document.getElementById(
        "knowledgeGrid"
      );


    const empty =
      document.getElementById(
        "knowledgeEmpty"
      );


    container.innerHTML = "";


    if (
      knowledgeSections.length === 0
    ) {

      empty.style.display =
        "block";

      return;
    }


    empty.style.display =
      "none";


    knowledgeSections.forEach(
      section => {

        const card =
          document.createElement(
            "div"
          );


        card.className =
          "knowledge-card";


        const items =
          Array.isArray(
            section.items
          )
            ?
            section.items
            :
            [];


        const itemsHTML =
          items
            .map(
              item =>
                `
                  <li>
                    ${escapeHTML(item)}
                  </li>
                `
            )
            .join("");


        card.innerHTML = `

          <div class="item-card-actions admin-only">

            <button
              type="button"
              class="edit-item-btn"
              onclick="editKnowledgeSection('${section.id}')"
              title="Edit"
            >
              ✎
            </button>


            <button
              type="button"
              class="delete-item-btn"
              onclick="deleteKnowledgeSection('${section.id}')"
              title="Delete"
            >
              ✕
            </button>

          </div>


          <h3>
            ${escapeHTML(section.title)}
          </h3>


          <ul>
            ${itemsHTML}
          </ul>

        `;


        container.appendChild(
          card
        );


        observeRevealElement(
          card
        );
      }
    );
  }


  function openKnowledgeEditor() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    editingKnowledgeSectionId =
      null;


    document
      .getElementById(
        "knowledgeModalTitle"
      )
      .textContent =
      "Add Knowledge Topic";


    document
      .getElementById(
        "knowledgeTitle"
      )
      .value =
      "";


    document
      .getElementById(
        "knowledgeItems"
      )
      .value =
      "";


    document
      .getElementById(
        "knowledgeModal"
      )
      .style.display =
      "flex";


    document
      .getElementById(
        "knowledgeTitle"
      )
      .focus();
  }


  function editKnowledgeSection(id) {

    if (!isAdmin) {
      return;
    }


    const section =
      knowledgeSections.find(
        item =>
          item.id === id
      );


    if (!section) {
      return;
    }


    editingKnowledgeSectionId =
      section.id;


    document
      .getElementById(
        "knowledgeModalTitle"
      )
      .textContent =
      "Edit Knowledge Topic";


    document
      .getElementById(
        "knowledgeTitle"
      )
      .value =
      section.title || "";


    document
      .getElementById(
        "knowledgeItems"
      )
      .value =
      Array.isArray(section.items)
        ?
        section.items.join("\n")
        :
        "";


    document
      .getElementById(
        "knowledgeModal"
      )
      .style.display =
      "flex";


    document
      .getElementById(
        "knowledgeTitle"
      )
      .focus();
  }


  async function saveKnowledgeSection() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    const title =
      document
        .getElementById(
          "knowledgeTitle"
        )
        .value
        .trim();


    const items =
      document
        .getElementById(
          "knowledgeItems"
        )
        .value
        .split("\n")
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);


    if (!title) {

      alert(
        "Enter a topic title."
      );

      return;
    }


    if (items.length === 0) {

      alert(
        "Add at least one item."
      );

      return;
    }


    let result;


    if (editingKnowledgeSectionId) {

      result =
        await supabaseClient
          .from("knowledge_sections")
          .update({
            title,
            items
          })
          .eq(
            "id",
            editingKnowledgeSectionId
          )
          .eq(
            "user_id",
            currentUser.id
          );

    }

    else {

      const nextSortOrder =
        knowledgeSections.reduce(
          (
            highest,
            section
          ) =>
            Math.max(
              highest,
              Number(
                section.sort_order
              ) || 0
            ),
          0
        ) + 1;


      result =
        await supabaseClient
          .from("knowledge_sections")
          .insert({
            user_id:
              currentUser.id,
            title,
            items,
            sort_order:
              nextSortOrder
          });

    }


    if (result.error) {

      console.error(
        "Knowledge Base save error:",
        result.error
      );


      alert(
        "Could not save knowledge topic."
      );

      return;
    }


    closeKnowledgeEditor();

    await loadKnowledgeSections();
  }


  async function deleteKnowledgeSection(id) {

    if (!isAdmin) {
      return;
    }


    const confirmed =
      confirm(
        "Delete this knowledge topic?"
      );


    if (!confirmed) {
      return;
    }


    const { error } =
      await supabaseClient
        .from("knowledge_sections")
        .delete()
        .eq("id", id)
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "Knowledge Base delete error:",
        error
      );


      alert(
        "Could not delete knowledge topic."
      );

      return;
    }


    await loadKnowledgeSections();
  }


  function closeKnowledgeEditor() {

    document
      .getElementById(
        "knowledgeModal"
      )
      .style.display =
      "none";


    editingKnowledgeSectionId =
      null;
  }


  /* =========================================
     CERTIFICATES - SUPABASE
  ========================================= */

  let certificates = [];

  let currentCertificateFilter =
    "all";


  function setCertificatesExpanded(
    expanded
  ) {

    const toggle =
      document.getElementById(
        "certificatesToggle"
      );


    const content =
      document.getElementById(
        "certificatesContent"
      );


    if (!toggle || !content) {
      return;
    }


    toggle.setAttribute(
      "aria-expanded",
      String(expanded)
    );


    toggle.setAttribute(
      "aria-label",
      expanded
        ?
        "Hide certificates"
        :
        "Show certificates"
    );


    content.classList.toggle(
      "is-open",
      expanded
    );


    content.setAttribute(
      "aria-hidden",
      String(!expanded)
    );


    content.inert =
      !expanded;
  }


  function toggleCertificates() {

    const toggle =
      document.getElementById(
        "certificatesToggle"
      );


    if (!toggle) {
      return;
    }


    const isExpanded =
      toggle.getAttribute(
        "aria-expanded"
      ) === "true";


    setCertificatesExpanded(
      !isExpanded
    );
  }


  function openCertificatesFromHash() {

    if (
      window.location.hash
      ===
      "#certificates"
    ) {

      setCertificatesExpanded(
        true
      );

    }
  }


  window.addEventListener(
    "hashchange",
    openCertificatesFromHash
  );


  openCertificatesFromHash();


  /* =========================================
     LOAD CERTIFICATES
  ========================================= */

  async function loadCertificates() {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("certificates")
        .select("*")
        .eq(
          "user_id",
          activePortfolioUserId
        )
        .order(
          "certificate_date",
          {
            ascending: false,
            nullsFirst: false
          }
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Certificate loading error:",
        error
      );

      return;
    }


    certificates =
      data || [];


    updatePortfolioStatCounts();


    displayCertificates();
    updatePortfolioCompletion();
  }


  /* =========================================
     CATEGORY NAMES
  ========================================= */

  function getCategoryName(category) {

    const names = {

      cybersecurity:
        "Cybersecurity",

      linux:
        "Linux & Networking",

      programming:
        "Programming",

      web:
        "Web Development",

      other:
        "Other"

    };


    return (
      names[category]
      ||
      "Other"
    );
  }


  /* =========================================
     CATEGORY ICONS
  ========================================= */

  function getCertificateIcon(category) {

    const icons = {

      cybersecurity:
        "🔐",

      linux:
        "🐧",

      programming:
        "💻",

      web:
        "🌐",

      other:
        "🎓"

    };


    return (
      icons[category]
      ||
      "🎓"
    );
  }


  /* =========================================
     GET FILE URL
  ========================================= */

  function getCertificateFileURL(
    filePath
  ) {

    if (!filePath) {
      return "";
    }


    const {
      data
    } =
      supabaseClient
        .storage
        .from(
          "portfolio-files"
        )
        .getPublicUrl(
          filePath
        );


    return (
      data?.publicUrl
      ||
      ""
    );
  }


  /* =========================================
     DISPLAY CERTIFICATES
  ========================================= */

  function displayCertificates() {

    const container =
      document.getElementById(
        "certificatesGrid"
      );


    const empty =
      document.getElementById(
        "certificatesEmpty"
      );


    container.innerHTML =
      "";


    const filtered =
      certificates.filter(
        certificate => {

          if (
            currentCertificateFilter
            ===
            "all"
          ) {

            return true;
          }


          return (
            certificate.category
            ===
            currentCertificateFilter
          );

        }
      );


    if (
      filtered.length === 0
    ) {

      empty.style.display =
        "block";

      return;
    }


    empty.style.display =
      "none";


    filtered.forEach(
      certificate => {


        const card =
          document.createElement(
            "div"
          );


        card.className =
          "new-certificate-card";


        const fileURL =
          getCertificateFileURL(
            certificate.file_path
          );


        let previewHTML =
          "";


        if (
          certificate.file_type
          &&
          certificate.file_type
            .startsWith(
              "image/"
            )
        ) {

          previewHTML = `

                    <div class="certificate-preview">

                        <img
                            src="${fileURL}"
                            alt="Certificate Preview"
                            class="certificate-object-image"
                        >

                    </div>

                `;

        }

        else if (
          certificate.file_type
          ===
          "application/pdf"
        ) {

          previewHTML = `

                    <div class="certificate-preview">

                        <div class="pdf-preview">

                            📄

                            <span>
                                PDF Certificate
                            </span>

                        </div>

                    </div>

                `;

        }


        card.innerHTML = `

                <button
                    type="button"
                    class="delete-certificate admin-only"
                    onclick="deleteCertificate('${certificate.id}')"
                    title="Delete"
                >
                    ✕
                </button>


                ${previewHTML}


                <div class="certificate-card-icon">

                    ${getCertificateIcon(
          certificate.category
        )}

                </div>


                <span class="certificate-category">

                    ${getCategoryName(
          certificate.category
        )}

                </span>


                <h3>

                    ${escapeHTML(
          certificate.name
        )}

                </h3>


                <div class="certificate-organization">

                    ${escapeHTML(
          certificate.organization
        )}

                </div>


                <div class="certificate-card-footer">

                    <span class="certificate-date">

                        ${
          escapeHTML(
            certificate.certificate_date
            ||
            ""
          )
          ||
          "No date"
        }

                    </span>


                    <button
                        type="button"
                        class="view-certificate-btn"
                        onclick="viewCertificate('${certificate.id}')"
                    >
                        View Certificate ↗
                    </button>

                </div>

            `;


        container.appendChild(
          card
        );


        observeRevealElement(
          card
        );

      }
    );
  }


  /* =========================================
     OPEN FORM
  ========================================= */

  function openCertificateForm() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    document
      .getElementById(
        "certificateModal"
      )
      .style.display =
      "flex";


    document
      .getElementById(
        "certificateName"
      )
      .focus();
  }


  /* =========================================
     CLOSE FORM
  ========================================= */

  function closeCertificateForm() {

    document
      .getElementById(
        "certificateModal"
      )
      .style.display =
      "none";
  }


  /* =========================================
     CLEAR FORM
  ========================================= */

  function clearCertificateForm() {

    document
      .getElementById(
        "certificateName"
      )
      .value =
      "";


    document
      .getElementById(
        "certificateOrganization"
      )
      .value =
      "";


    document
      .getElementById(
        "certificateCategory"
      )
      .value =
      "cybersecurity";


    document
      .getElementById(
        "certificateDate"
      )
      .value =
      "";


    document
      .getElementById(
        "certificateFile"
      )
      .value =
      "";
  }


  /* =========================================
     ADD CERTIFICATE
  ========================================= */

  async function addCertificate() {

    if (!isAdmin) {

      alert(
        "Open your Dashboard to edit this portfolio."
      );

      return;
    }


    const name =
      document
        .getElementById(
          "certificateName"
        )
        .value
        .trim();


    const organization =
      document
        .getElementById(
          "certificateOrganization"
        )
        .value
        .trim();


    const category =
      document
        .getElementById(
          "certificateCategory"
        )
        .value;


    const certificateDate =
      document
        .getElementById(
          "certificateDate"
        )
        .value
        .trim();


    const file =
      document
        .getElementById(
          "certificateFile"
        )
        .files[0];


    if (!name) {

      alert(
        "Enter certificate name."
      );

      return;
    }


    if (!organization) {

      alert(
        "Enter organization."
      );

      return;
    }


    if (!file) {

      alert(
        "Choose a PDF or image."
      );

      return;
    }


    const allowedTypes = [

      "application/pdf",

      "image/png",

      "image/jpeg",

      "image/webp"

    ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      alert(
        "Only PDF, PNG, JPG and WebP are allowed."
      );

      return;
    }


    if (
      file.size >
      20 * 1024 * 1024
    ) {

      alert(
        "Certificate file must be under 20 MB."
      );

      return;
    }


    const safeFileName =
      file.name
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );


    const filePath =
      `users/${currentUser.id}/certificates/`
      +
      Date.now()
      +
      "-"
      +
      crypto.randomUUID()
      +
      "-"
      +
      safeFileName;


    /* UPLOAD FILE */

    const {
      error: uploadError
    } =
      await supabaseClient
        .storage
        .from(
          "portfolio-files"
        )
        .upload(
          filePath,
          file,
          {
            contentType:
            file.type,

            upsert:
              false
          }
        );


    if (uploadError) {

      console.error(
        "Certificate upload error:",
        uploadError
      );


      alert(
        "Could not upload certificate file."
      );

      return;
    }


    /* SAVE INFORMATION */

    const {
      error: databaseError
    } =
      await supabaseClient
        .from(
          "certificates"
        )
        .insert({

          user_id:
            currentUser.id,

          name,

          organization,

          category,

          certificate_date:
            certificateDate
            ||
            null,

          file_path:
          filePath,

          file_type:
          file.type

        });


    if (databaseError) {

      console.error(
        "Certificate database error:",
        databaseError
      );


      /* REMOVE FILE IF DATABASE SAVE FAILED */

      await supabaseClient
        .storage
        .from(
          "portfolio-files"
        )
        .remove([
          filePath
        ]);


      alert(
        "Could not save certificate."
      );

      return;
    }


    clearCertificateForm();


    closeCertificateForm();


    await loadCertificates();
  }


  /* =========================================
     VIEW CERTIFICATE
  ========================================= */

  function viewCertificate(
    certificateId
  ) {

    const certificate =
      certificates.find(
        certificate =>
          certificate.id
          ===
          certificateId
      );


    if (
      !certificate
      ||
      !certificate.file_path
    ) {

      alert(
        "Certificate file was not found."
      );

      return;
    }


    const url =
      getCertificateFileURL(
        certificate.file_path
      );


    if (!url) {

      alert(
        "Certificate file was not found."
      );

      return;
    }


    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }


  /* =========================================
     DELETE CERTIFICATE
  ========================================= */

  async function deleteCertificate(
    certificateId
  ) {

    if (!isAdmin) {
      return;
    }


    const certificate =
      certificates.find(
        certificate =>
          certificate.id
          ===
          certificateId
      );


    if (!certificate) {
      return;
    }


    const yes =
      confirm(
        "Delete this certificate?"
      );


    if (!yes) {
      return;
    }


    /* DELETE FILE */

    if (
      certificate.file_path
    ) {

      const {
        error: storageError
      } =
        await supabaseClient
          .storage
          .from(
            "portfolio-files"
          )
          .remove([
            certificate.file_path
          ]);


      if (storageError) {

        console.error(
          "Certificate file delete error:",
          storageError
        );

        alert(
          "Could not delete certificate file."
        );

        return;
      }

    }


    /* DELETE DATABASE RECORD */

    const {
      error
    } =
      await supabaseClient
        .from(
          "certificates"
        )
        .delete()
        .eq(
          "id",
          certificateId
        )
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "Certificate delete error:",
        error
      );


      alert(
        "Could not delete certificate."
      );

      return;
    }


    await loadCertificates();
  }


  /* =========================================
     FILTER
  ========================================= */

  function filterCertificates(
    category,
    button
  ) {

    currentCertificateFilter =
      category;


    document
      .querySelectorAll(
        ".certificate-filter"
      )
      .forEach(
        item => {

          item.classList.remove(
            "active"
          );

        }
      );


    button.classList.add(
      "active"
    );


    displayCertificates();
  }


  /* =========================================
     START
  ========================================= */

  /* =========================================
     MODAL BACKGROUND CLICKS
  ========================================= */

  document
    .getElementById(
      "profileModal"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target
          ===
          event.currentTarget
        ) {

          if (document.querySelector("dialog[open]")) return;

      closeProfileEditor();

        }

      }
    );


  document
    .getElementById(
      "itemModal"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target
          ===
          event.currentTarget
        ) {

          closeItemEditor();

        }

      }
    );


  document
    .getElementById(
      "certificateModal"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target
          ===
          event.currentTarget
        ) {

          closeCertificateForm();

        }

      }
    );


  document
    .getElementById(
      "learningPostModal"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target
          ===
          event.currentTarget
        ) {

          closeLearningPostEditor();

        }

      }
    );


  document
    .getElementById(
      "knowledgeModal"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target
          ===
          event.currentTarget
        ) {

          closeKnowledgeEditor();

        }

      }
    );


  document
    .getElementById(
      "currentLearningModal"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target
          ===
          event.currentTarget
        ) {

          closeCurrentLearningEditor();

        }

      }
    );


  document
    .getElementById(
      "growthItemModal"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target
          ===
          event.currentTarget
        ) {

          closeGrowthItemEditor();

        }

      }
    );


  /* =========================================
     EDUCATION / BADGES / TESTIMONIALS
  ========================================= */

  let educationItems = [];
  let achievementBadges = [];
  let testimonials = [];
  let profileEntryEditorType = "";
  let editingProfileEntryId = null;


  function formatProfileDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short"
        });
  }


  function createCommunityCard(options) {
    const card = document.createElement("article");
    card.className = "community-card";

    const actions = document.createElement("div");
    actions.className = "item-card-actions admin-only";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-item-btn";
    editButton.title = "Edit";
    editButton.textContent = "✎";
    editButton.onclick = () =>
      openProfileEntryEditor(options.type, options.id);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-item-btn";
    deleteButton.title = "Delete";
    deleteButton.textContent = "×";
    deleteButton.onclick = () =>
      deleteProfileEntry(options.type, options.id);

    actions.append(editButton, deleteButton);
    card.appendChild(actions);

    const icon = document.createElement("span");
    icon.className = "community-card-icon";
    icon.textContent = options.icon || "•";
    card.appendChild(icon);

    const heading = document.createElement("h3");
    heading.textContent = options.title;
    card.appendChild(heading);

    if (options.description) {
      const paragraph = document.createElement("p");
      paragraph.textContent = options.description;
      card.appendChild(paragraph);
    }

    const cleanMeta = (options.meta || []).filter(Boolean);
    if (cleanMeta.length) {
      const metadata = document.createElement("div");
      metadata.className = "community-card-meta";
      cleanMeta.forEach(value => {
        const item = document.createElement("span");
        item.textContent = value;
        metadata.appendChild(item);
      });
      card.appendChild(metadata);
    }

    const safeLink = safeHttpUrl(options.link || "");
    if (safeLink) {
      const anchor = document.createElement("a");
      anchor.className = "community-card-link";
      anchor.href = safeLink;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = options.linkLabel || "View Profile ↗";
      card.appendChild(anchor);
    }

    return card;
  }


  function displayEducationItems() {
    const grid = document.getElementById("educationGrid");
    const empty = document.getElementById("educationEmpty");
    grid.innerHTML = "";
    empty.style.display = educationItems.length ? "none" : "block";

    educationItems.forEach(item => {
      const dates = [
        formatProfileDate(item.start_date),
        item.graduation_date
          ? `to ${formatProfileDate(item.graduation_date)}`
          : ""
      ].filter(Boolean).join(" ");

      const card = createCommunityCard({
        icon: "🎓",
        title: item.institution,
        description: [
          [item.degree, item.field_of_study].filter(Boolean).join(" · "),
          item.description
        ].filter(Boolean).join("\n"),
        meta: [item.current_level, dates, item.gpa ? `GPA ${item.gpa}` : ""],
        type: "education",
        id: item.id
      });
      grid.appendChild(card);
      observeRevealElement(card);
    });
  }


  function displayAchievementBadges() {
    const grid = document.getElementById("achievementsGrid");
    const empty = document.getElementById("achievementsEmpty");
    grid.innerHTML = "";
    empty.style.display = achievementBadges.length ? "none" : "block";

    achievementBadges.forEach(item => {
      const card = createCommunityCard({
        icon: item.icon || "🏆",
        title: item.title,
        description: item.description || "",
        meta: [formatProfileDate(item.badge_date)],
        type: "achievement",
        id: item.id
      });
      grid.appendChild(card);
      observeRevealElement(card);
    });
  }


  function displayTestimonials() {
    const grid = document.getElementById("testimonialsGrid");
    const empty = document.getElementById("testimonialsEmpty");
    grid.innerHTML = "";
    empty.style.display = testimonials.length ? "none" : "block";

    testimonials.forEach(item => {
      const card = createCommunityCard({
        icon: "❝",
        title: item.author_name,
        description: item.content,
        meta: [item.author_role],
        link: item.author_url || "",
        type: "testimonial",
        id: item.id
      });
      grid.appendChild(card);
      observeRevealElement(card);
    });
  }


  async function loadEducationItems() {
    const { data, error } = await supabaseClient
      .from("education_items")
      .select("*")
      .eq("user_id", activePortfolioUserId)
      .order("graduation_date", { ascending: false, nullsFirst: true })
      .order("created_at", { ascending: false });

    educationItems = error ? [] : (data || []);
    if (error) console.error("Education loading error:", error);
    displayEducationItems();
  }


  async function loadAchievementBadges() {
    const { data, error } = await supabaseClient
      .from("achievement_badges")
      .select("*")
      .eq("user_id", activePortfolioUserId)
      .order("badge_date", { ascending: false })
      .order("created_at", { ascending: false });

    achievementBadges = error ? [] : (data || []);
    if (error) console.error("Achievement loading error:", error);
    displayAchievementBadges();
  }


  async function loadTestimonials() {
    const { data, error } = await supabaseClient
      .from("testimonials")
      .select("*")
      .eq("user_id", activePortfolioUserId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    testimonials = error ? [] : (data || []);
    if (error) console.error("Testimonials loading error:", error);
    displayTestimonials();
  }


  function getProfileEntryCollection(type) {
    if (type === "education") return educationItems;
    if (type === "achievement") return achievementBadges;
    if (type === "testimonial") return testimonials;
    return [];
  }


  function clearProfileEntryFields() {
    [
      "educationInstitution", "educationDegree", "educationField",
      "educationLevel", "educationStartDate", "educationGraduationDate",
      "educationGpa", "educationDescription", "achievementTitle",
      "achievementIcon", "achievementDate", "achievementDescription",
      "testimonialAuthorName", "testimonialAuthorRole",
      "testimonialContent", "testimonialAuthorUrl"
    ].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = "";
    });
  }


  function openProfileEntryEditor(type, itemId = null) {
    if (!isAdmin) {
      alert("Open your Dashboard to edit this portfolio.");
      return;
    }

    const titles = {
      education: itemId ? "Edit Education" : "Add Education",
      achievement: itemId ? "Edit Badge" : "Add Badge",
      testimonial: itemId ? "Edit Testimonial" : "Add Testimonial"
    };

    if (!titles[type]) return;

    profileEntryEditorType = type;
    editingProfileEntryId = itemId;
    clearProfileEntryFields();

    ["education", "achievement", "testimonial"].forEach(entryType => {
      document.getElementById(`${entryType}EntryFields`).hidden =
        entryType !== type;
    });

    document.getElementById("profileEntryModalTitle").textContent =
      titles[type];

    const item = itemId
      ? getProfileEntryCollection(type).find(entry => entry.id === itemId)
      : null;

    if (item && type === "education") {
      document.getElementById("educationInstitution").value = item.institution || "";
      document.getElementById("educationDegree").value = item.degree || "";
      document.getElementById("educationField").value = item.field_of_study || "";
      document.getElementById("educationLevel").value = item.current_level || "";
      document.getElementById("educationStartDate").value = item.start_date || "";
      document.getElementById("educationGraduationDate").value = item.graduation_date || "";
      document.getElementById("educationGpa").value = item.gpa || "";
      document.getElementById("educationDescription").value = item.description || "";
    }
    else if (item && type === "achievement") {
      document.getElementById("achievementTitle").value = item.title || "";
      document.getElementById("achievementIcon").value = item.icon || "";
      document.getElementById("achievementDate").value = item.badge_date || "";
      document.getElementById("achievementDescription").value = item.description || "";
    }
    else if (item && type === "testimonial") {
      document.getElementById("testimonialAuthorName").value = item.author_name || "";
      document.getElementById("testimonialAuthorRole").value = item.author_role || "";
      document.getElementById("testimonialContent").value = item.content || "";
      document.getElementById("testimonialAuthorUrl").value = item.author_url || "";
    }

    document.getElementById("profileEntryModal").style.display = "flex";
  }


  function closeProfileEntryEditor() {
    document.getElementById("profileEntryModal").style.display = "none";
    profileEntryEditorType = "";
    editingProfileEntryId = null;
  }


  function readProfileEntryPayload(type) {
    if (type === "education") {
      const institution = document.getElementById("educationInstitution").value.trim();
      const degree = document.getElementById("educationDegree").value.trim();
      const field = document.getElementById("educationField").value.trim();
      const startDate = document.getElementById("educationStartDate").value;
      const graduationDate = document.getElementById("educationGraduationDate").value;

      if (!institution || !degree || !field) {
        throw new Error("University, degree, and field of study are required.");
      }
      if (startDate && graduationDate && graduationDate < startDate) {
        throw new Error("Graduation date cannot be before the start date.");
      }

      return {
        institution,
        degree,
        field_of_study: field,
        current_level: document.getElementById("educationLevel").value.trim() || null,
        start_date: startDate || null,
        graduation_date: graduationDate || null,
        gpa: document.getElementById("educationGpa").value.trim() || null,
        description: document.getElementById("educationDescription").value.trim() || null
      };
    }

    if (type === "achievement") {
      const title = document.getElementById("achievementTitle").value.trim();
      if (!title) throw new Error("Badge or achievement title is required.");
      return {
        title,
        icon: document.getElementById("achievementIcon").value.trim() || "🏆",
        badge_date: document.getElementById("achievementDate").value || null,
        description: document.getElementById("achievementDescription").value.trim() || null
      };
    }

    if (type !== "testimonial") {
      throw new Error("Unknown entry type.");
    }

    const authorName = document.getElementById("testimonialAuthorName").value.trim();
    const authorRole = document.getElementById("testimonialAuthorRole").value.trim();
    const content = document.getElementById("testimonialContent").value.trim();
    const rawURL = document.getElementById("testimonialAuthorUrl").value.trim();
    const authorURL = rawURL ? safeHttpUrl(rawURL) : "";

    if (!authorName || !authorRole || !content) {
      throw new Error("Name, role, and recommendation are required.");
    }
    if (rawURL && !authorURL) {
      throw new Error("Enter a valid http or https profile link.");
    }

    return {
      author_name: authorName,
      author_role: authorRole,
      content,
      author_url: authorURL || null
    };
  }


  async function saveProfileEntry() {
    if (!isAdmin || !currentUser) return;

    const type = profileEntryEditorType;
    const tableNames = {
      education: "education_items",
      achievement: "achievement_badges",
      testimonial: "testimonials"
    };
    const loaders = {
      education: loadEducationItems,
      achievement: loadAchievementBadges,
      testimonial: loadTestimonials
    };

    if (!tableNames[type]) return;

    let payload;
    try {
      payload = readProfileEntryPayload(type);
    }
    catch (error) {
      alert(error.message);
      return;
    }

    const button = document.getElementById("saveProfileEntryButton");
    button.disabled = true;
    button.textContent = "Saving...";

    let query = supabaseClient.from(tableNames[type]);
    query = editingProfileEntryId
      ? query.update(payload)
          .eq("id", editingProfileEntryId)
          .eq("user_id", currentUser.id)
      : query.insert({ ...payload, user_id: currentUser.id });

    const { error } = await query;
    button.disabled = false;
    button.textContent = "Save";

    if (error) {
      console.error("Profile entry save error:", error);
      alert("Could not save this entry.");
      return;
    }

    closeProfileEntryEditor();
    await loaders[type]();
  }


  async function deleteProfileEntry(type, itemId) {
    if (!isAdmin || !currentUser) return;

    const tableNames = {
      education: "education_items",
      achievement: "achievement_badges",
      testimonial: "testimonials"
    };
    const loaders = {
      education: loadEducationItems,
      achievement: loadAchievementBadges,
      testimonial: loadTestimonials
    };

    if (!tableNames[type] || !confirm("Delete this entry permanently?")) return;

    const { error } = await supabaseClient
      .from(tableNames[type])
      .delete()
      .eq("id", itemId)
      .eq("user_id", currentUser.id);

    if (error) {
      console.error("Profile entry delete error:", error);
      alert("Could not delete this entry.");
      return;
    }

    await loaders[type]();
  }


  /* =========================================
     CONTACT FORM - SUPABASE EDGE FUNCTION
  ========================================= */

  const CONTACT_COOLDOWN_MS = 30000;

  const CONTACT_COOLDOWN_KEY =
    "myDevFolioHubContactLastSent";

  let contactRequestInFlight = false;


  function setContactFormMessage(
    message,
    success = false,
    form = document.getElementById("contactForm")
  ) {

    const messageElement = form?.querySelector(".contact-form-message");
    if (!messageElement) return;


    messageElement.textContent =
      message || "";


    messageElement.classList.toggle(
      "success",
      success
    );
  }


  function getLastContactSentAt() {

    try {
      return Number(
        sessionStorage.getItem(
          CONTACT_COOLDOWN_KEY
        )
      ) || 0;
    }

    catch {
      return 0;
    }
  }


  function rememberContactSent() {

    try {
      sessionStorage.setItem(
        CONTACT_COOLDOWN_KEY,
        String(Date.now())
      );
    }

    catch {
      // The in-flight guard still prevents duplicate requests.
    }
  }


  function validateContactMessage(
    contactData
  ) {

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    const contactIsArabic =
      getCurrentLanguage() === "ar";


    if (!contactData.name) {
      return (
        contactIsArabic
          ?
          "فضلًا أدخل اسمك."
          :
          "Please enter your name."
      );
    }


    if (contactData.name.length > 100) {
      return (
        contactIsArabic
          ?
          "يجب ألا يتجاوز الاسم 100 حرف."
          :
          "Name must not exceed 100 characters."
      );
    }


    if (
      !contactData.email
      ||
      !emailPattern.test(
        contactData.email
      )
    ) {
      return (
        contactIsArabic
          ?
          "فضلًا أدخل بريدًا إلكترونيًا صحيحًا."
          :
          "Please enter a valid email address."
      );
    }


    if (!contactData.subject) {
      return (
        contactIsArabic
          ?
          "فضلًا أدخل الموضوع."
          :
          "Please enter a subject."
      );
    }


    if (contactData.subject.length > 150) {
      return (
        contactIsArabic
          ?
          "يجب ألا يتجاوز الموضوع 150 حرفًا."
          :
          "Subject must not exceed 150 characters."
      );
    }


    if (!contactData.message) {
      return (
        contactIsArabic
          ?
          "فضلًا اكتب رسالتك."
          :
          "Please enter your message."
      );
    }


    if (contactData.message.length > 3000) {
      return (
        contactIsArabic
          ?
          "يجب ألا تتجاوز الرسالة 3000 حرف."
          :
          "Message must not exceed 3000 characters."
      );
    }


    return "";
  }


  async function sendContactMessage(
    event
  ) {

    event.preventDefault();


    if (contactRequestInFlight) {
      return;
    }


    const form = event.currentTarget;
    const setMessage = (message, success = false) => setContactFormMessage(message, success, form);


    const contactData = {
      name:
        form.elements.namedItem("name").value.trim(),

      email:
        form.elements.namedItem("email").value.trim(),

      subject:
        form.elements.namedItem("subject").value.trim(),

      message:
        form.elements.namedItem("message").value.trim()
    };


    const honeypotValue =
      form.elements.namedItem("website").value.trim();


    const sendIsArabic =
      getCurrentLanguage() === "ar";


    if (honeypotValue) {
      form.reset();

      setMessage(
        sendIsArabic
          ?
          "تم إرسال الرسالة بنجاح ✓"
          :
          "Message sent successfully ✓",
        true
      );

      return;
    }


    const validationError =
      validateContactMessage(
        contactData
      );


    if (validationError) {
      setMessage(
        validationError
      );

      return;
    }


    const timeSinceLastSend =
      Date.now()
      -
      getLastContactSentAt();


    if (
      timeSinceLastSend
      <
      CONTACT_COOLDOWN_MS
    ) {

      const secondsRemaining =
        Math.ceil(
          (
            CONTACT_COOLDOWN_MS
            -
            timeSinceLastSend
          )
          /
          1000
        );


      setMessage(
        sendIsArabic
          ?
          `فضلًا انتظر ${secondsRemaining} ثانية قبل إرسال رسالة أخرى.`
          :
          `Please wait ${secondsRemaining} seconds before sending another message.`
      );

      return;
    }


    const submitButton =
      form.querySelector('button[type="submit"]');


    contactRequestInFlight = true;
    submitButton.disabled = true;
    submitButton.textContent =
      sendIsArabic
        ?
        "جارٍ الإرسال..."
        :
        "Sending...";


    setMessage("");


    try {

      const { data, error } =
        await supabaseClient.functions
          .invoke(
            "send-contact-email",
            {
              body: contactData
            }
          );


      if (
        error
        ||
        data?.success === false
        ||
        data?.error
      ) {
        throw new Error(
          "CONTACT_REQUEST_FAILED"
        );
      }


      rememberContactSent();
      form.reset();


      setMessage(
        sendIsArabic
          ?
          "تم إرسال الرسالة بنجاح ✓"
          :
          "Message sent successfully ✓",
        true
      );

    }

    catch {

      console.error(
        "Contact form request failed."
      );


      setMessage(
        sendIsArabic
          ?
          "تعذر إرسال الرسالة. حاول مجددًا."
          :
          "Could not send message. Please try again."
      );

    }

    finally {

      contactRequestInFlight = false;
      submitButton.disabled = false;
      submitButton.textContent =
        "Send Message";

    }
  }



  /* =========================================
     PERMANENT ACCOUNT DELETION
  ========================================= */

  function setDeleteAccountMessage(message) {
    const element = document.getElementById("deleteAccountMessage");
    if (element) element.textContent = message;
  }


  function openDeleteAccountModal() {
    if (!currentUser || !signedInProfile) return;

    if (isPlatformAdmin) {
      alert(
        "The Platform Admin account is protected from self-deletion. Transfer or remove the platform-admin role first if deletion is ever required."
      );
      return;
    }

    const phrase = `DELETE @${signedInProfile.username}`;
    document.getElementById("deleteAccountPhrase").textContent = phrase;
    document.getElementById("deleteAccountPassword").value = "";
    document.getElementById("deleteAccountConfirmation").value = "";
    setDeleteAccountMessage("");
    openProductDialog("deleteAccountModal");
  }


  function closeDeleteAccountModal() {
    closeProductDialog("deleteAccountModal");
    document.getElementById("deleteAccountPassword").value = "";
    document.getElementById("deleteAccountConfirmation").value = "";
    setDeleteAccountMessage("");
  }


  async function listOwnedStorageFiles(folder) {
    const paths = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabaseClient.storage.from("portfolio-files")
        .list(folder, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      paths.push(...(data || []).filter(item => item.id).map(item => folder + "/" + item.name));
      if (!data || data.length < 1000) return paths;
    }
  }


  async function deleteCurrentAccount() {
    if (!currentUser || !signedInProfile || isPlatformAdmin) return;

    const password = document.getElementById("deleteAccountPassword").value;
    const confirmation = document.getElementById("deleteAccountConfirmation").value.trim();
    const expectedPhrase = `DELETE @${signedInProfile.username}`;
    const button = document.getElementById("confirmDeleteAccountButton");

    if (!password) {
      setDeleteAccountMessage("Enter your current password.");
      return;
    }

    if (confirmation !== expectedPhrase) {
      setDeleteAccountMessage(`Type ${expectedPhrase} exactly to continue.`);
      return;
    }

    button.disabled = true;
    button.textContent = "Deleting account...";
    setDeleteAccountMessage("");

    try {
      const { error: authenticationError } =
        await supabaseClient.auth.signInWithPassword({
          email: currentUser.email,
          password
        });

      if (authenticationError) {
        throw new Error("PASSWORD_INVALID");
      }

      const adminCheck = await supabaseClient.rpc("is_admin");
      if (adminCheck.error || adminCheck.data === true) throw new Error("ACCOUNT_DELETE_FAILED");
      const userRoot = `users/${currentUser.id}`;
      const [profileFiles, certificateFiles] = await Promise.all([
        listOwnedStorageFiles(`${userRoot}/profile`),
        listOwnedStorageFiles(`${userRoot}/certificates`)
      ]);

      const storedPaths = new Set([
        ...profileFiles,
        ...certificateFiles,
        ...(currentProfile.image_path ? [currentProfile.image_path] : []),
        ...certificates
          .map(certificate => certificate.file_path)
          .filter(Boolean)
      ].filter(filePath => typeof filePath === "string" && filePath.startsWith(userRoot + "/")));

      if (storedPaths.size) {
        const { error: storageError } = await supabaseClient.storage
          .from("portfolio-files")
          .remove([...storedPaths]);

        if (storageError) {
          console.error("Account storage cleanup error:", storageError);
          throw new Error("STORAGE_DELETE_FAILED");
        }
      }

      const { error: deletionError } =
        await supabaseClient.rpc("delete_own_account");

      if (deletionError) {
        console.error("Account deletion error:", deletionError);
        throw new Error("ACCOUNT_DELETE_FAILED");
      }

      await supabaseClient.auth.signOut({ scope: "local" });
      currentUser = null;
      signedInProfile = null;
      activePortfolioUserId = null;
      activePortfolioUsername = "";
      isAdmin = false;
      isPlatformAdmin = false;
      window.location.replace(getBasePageURL().href);
    }
    catch (error) {
      const message = error.message === "PASSWORD_INVALID"
        ? "The current password is incorrect."
        : error.message === "STORAGE_DELETE_FAILED"
          ? "Could not delete your uploaded files. Your account was not deleted."
          : "Could not delete your account. Please try again.";

      setDeleteAccountMessage(message);
      button.disabled = false;
      button.textContent = "Delete My Account Permanently";
    }
  }


  /* =========================================
     ESC KEY
  ========================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key
        !==
        "Escape"
      ) {

        return;

      }

      if (document.querySelector("dialog[open]")) return;


      closeProfileEditor();

      closeItemEditor();

      closeLearningPostEditor();

      closeCurrentLearningEditor();

      closeGrowthItemEditor();

      closeKnowledgeEditor();

      closeCertificateForm();

      closeProfileEntryEditor();

      closeDeleteAccountModal();

      closeSharePortfolioModal();

    }
  );


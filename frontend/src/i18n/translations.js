export const translations = {
  uz: {
    brand: {
      title: "Smart Office",
      subtitle: "Aktivlarni boshqarish"
    },
    nav: {
      dashboard: "Dashboard",
      assets: "Aktivlar",
      categories: "Kategoriyalar",
      inventories: "Inventarizatsiya",
      aging: "Eskirish (Aging)",
      qr: "QR ko‘rish",
      audit: "Audit",
      analytics: "Analitika"
    },
    common: {
      loading: "Yuklanmoqda…",
      refresh: "Yangilash",
      applyFilters: "Filtrlarni qo‘llash",
      open: "Ochish",
      unassigned: "Biriktirilmagan",
      refreshing: "Yangilanmoqda…",
      search: "Qidirish",
      allStatus: "Barcha statuslar",
      allCategories: "Barcha kategoriyalar",
      noData: "Hozircha ma’lumot yo‘q",
      noAssets: "Aktiv topilmadi"
    },
    auth: {
      signIn: "Kirish",
      username: "Login",
      password: "Parol",
      signInBtn: "Kirish",
      signingIn: "Kirilmoqda…",
      product: "Smart Office aktivlarini boshqarish",
      logout: "Chiqish"
    },
    dashboard: {
      overview: "Umumiy ko‘rinish",
      realtime: "Real vaqtda taqsimot",
      byStatus: "Status bo‘yicha",
      byCategory: "Kategoriya bo‘yicha"
    },
    assets: {
      title: "Aktivlar",
      subtitle: "Qidirish, filtr va aktiv tafsilotlari",
      addTitle: "Yangi aktiv qo‘shish",
      name: "Nomi",
      type: "Turi",
      category: "Kategoriya",
      serial: "Serial raqam",
      invTag: "Inventar tegi",
      model: "Model",
      vendor: "Ishlab chiqaruvchi",
      create: "Aktiv yaratish",
      createHint: "Nom, tur, kategoriya va serial raqamni to‘ldiring.",
      table: {
        name: "Nomi",
        serial: "Serial",
        status: "Status",
        category: "Kategoriya"
      }
    },
    assetDetail: {
      title: "Aktiv tafsilotlari",
      assetId: "Asset ID",
      status: "Status",
      serial: "Serial",
      category: "Kategoriya",
      type: "Tur",
      model: "Model",
      vendor: "Ishlab chiqaruvchi",
      currentOwner: "Hozirgi egasi",
      assign: "Biriktirish",
      return: "Qaytarish",
      changeStatus: "Statusni o‘zgartirish",
      ownerType: "Egasi turi",
      ownerUuid: "Ega UUID",
      reason: "Sabab",
      assignBtn: "Biriktirish",
      returnBtn: "Qaytarish",
      updateStatusBtn: "Yangilash",
      invalidOwnerUuid: "Ega UUID noto‘g‘ri",
      qr: "QR kod",
      generate: "Yaratish",
      token: "Token",
      preview: "Ko‘rinish",
      openQrView: "QR orqali ko‘rish",
      photos: "Rasmlar",
      upload: "Rasm yuklash",
      uploading: "Yuklanmoqda…",
      noPhotos: "Rasmlar yo‘q",
      assignmentHistory: "Biriktirish tarixi",
      statusHistory: "Status tarixi",
      noAssignments: "Hali biriktirish bo‘lmagan",
      noStatusChanges: "Status o‘zgarishlari yo‘q",
      table: {
        owner: "Ega",
        assigned: "Biriktirilgan",
        returned: "Qaytarilgan",
        fromTo: "From → To",
        time: "Vaqt"
      }
    },
    audit: {
      title: "Audit log",
      subtitle: "Asset UUID bo‘yicha qidirish",
      assetUuid: "Asset UUID",
      search: "Qidirish",
      none: "Audit yozuvlari yo‘q",
      table: {
        event: "Hodisa",
        actor: "Kim",
        time: "Vaqt"
      }
    },
    analytics: {
      statusDist: "Status taqsimoti",
      categoryDist: "Kategoriya taqsimoti",
      chartStatus: "Status bo‘yicha aktivlar",
      chartCategory: "Kategoriya bo‘yicha aktivlar"
    },
    categories: {
      title: "Aktiv kategoriyalari",
      subtitle: "Kategoriyalarni boshqarish (qo‘shish / tahrirlash / o‘chirish)",
      code: "Kod (masalan: IT)",
      name: "Nomi (masalan: IT)",
      create: "Yaratish",
      edit: "Tahrirlash",
      save: "Saqlash",
      cancel: "Bekor qilish",
      delete: "O‘chirish",
      table: {
        code: "Kod",
        name: "Nomi",
        actions: "Amallar"
      }
    },
    inventory: {
      title: "Inventarizatsiya",
      subtitle: "Skank qilish va mos kelmagan aktivlarni topish",
      createTitle: "Yangi sessiya",
      name: "Sessiya nomi",
      ownerType: "Ega turi",
      ownerId: "Ega ID (UUID)",
      useMyId: "Mening ID",
      create: "Sessiya yaratish",
      createHint: "Nom va ega ID ni kiriting.",
      table: {
        name: "Nomi",
        owner: "Ega",
        status: "Status",
        scanned: "Topilgan"
      },
      sessionId: "Sessiya ID",
      status: "Status",
      close: "Yopish",
      owner: "Ega",
      expected: "Kutilgan",
      scanned: "Topilgan",
      scanAsset: "Aktiv ID bilan skan",
      scanQr: "QR token bilan skan",
      assetId: "Asset ID (UUID)",
      note: "Izoh",
      qrToken: "QR token",
      scan: "Skan qilish",
      report: "Hisobot",
      missing: "Topilmagan (Missing)",
      unexpected: "Kutilmagan (Unexpected)"
    },
    aging: {
      title: "Eskirgan aktivlar",
      subtitle: "Purchase date yoki yaratish sanasiga ko‘ra",
      days: "Kun (masalan: 365)",
      includeTerminal: "Terminal statuslarni ham ko‘rsatish"
    },
    qr: {
      title: "QR tekshirish",
      subtitle: "Token orqali aktiv egasi va rasmlarini ko‘ring",
      token: "QR token",
      lookup: "Ko‘rish",
      photos: "Rasmlar"
    },
    status: {
      REGISTERED: "REGISTERED (ro‘yxatga olingan)",
      ASSIGNED: "ASSIGNED (biriktirilgan)",
      IN_REPAIR: "IN_REPAIR (ta’mirda)",
      LOST: "LOST (yo‘qolgan)",
      WRITTEN_OFF: "WRITTEN_OFF (hisobdan chiqarilgan)"
    },
    ownerType: {
      EMPLOYEE: "Xodim",
      DEPARTMENT: "Bo‘lim",
      BRANCH: "Filial"
    },
    lang: {
      uz: "O‘zbekcha",
      en: "English"
    }
  },
  en: {
    brand: {
      title: "Smart Office",
      subtitle: "Asset Management"
    },
    nav: {
      dashboard: "Dashboard",
      assets: "Assets",
      categories: "Categories",
      inventories: "Inventory",
      aging: "Aging",
      qr: "QR Lookup",
      audit: "Audit",
      analytics: "Analytics"
    },
    common: {
      loading: "Loading…",
      refresh: "Refresh",
      applyFilters: "Apply Filters",
      open: "Open",
      unassigned: "Unassigned",
      refreshing: "Refreshing…",
      search: "Search",
      allStatus: "All Status",
      allCategories: "All Categories",
      noData: "No data yet",
      noAssets: "No assets found"
    },
    auth: {
      signIn: "Sign in",
      username: "Username",
      password: "Password",
      signInBtn: "Sign in",
      signingIn: "Signing in…",
      product: "Smart Office Asset Management",
      logout: "Logout"
    },
    dashboard: {
      overview: "Overview",
      realtime: "Real-time asset distribution",
      byStatus: "By Status",
      byCategory: "By Category"
    },
    assets: {
      title: "Assets",
      subtitle: "Search, filter and open asset details",
      addTitle: "Add Asset",
      name: "Name",
      type: "Type",
      category: "Category",
      serial: "Serial Number",
      invTag: "Inventory Tag",
      model: "Model",
      vendor: "Vendor",
      create: "Create Asset",
      createHint: "Fill name, type, category, serial number.",
      table: {
        name: "Name",
        serial: "Serial",
        status: "Status",
        category: "Category"
      }
    },
    assetDetail: {
      title: "Asset Details",
      assetId: "Asset ID",
      status: "Status",
      serial: "Serial",
      category: "Category",
      type: "Type",
      model: "Model",
      vendor: "Vendor",
      currentOwner: "Current Owner",
      assign: "Assign",
      return: "Return",
      changeStatus: "Change Status",
      ownerType: "Owner Type",
      ownerUuid: "Owner UUID",
      reason: "Reason",
      assignBtn: "Assign",
      returnBtn: "Return",
      updateStatusBtn: "Update Status",
      invalidOwnerUuid: "Owner UUID is invalid",
      qr: "QR Code",
      generate: "Generate",
      token: "Token",
      preview: "Preview",
      openQrView: "Open QR view",
      photos: "Photos",
      upload: "Upload photo",
      uploading: "Uploading…",
      noPhotos: "No photos",
      assignmentHistory: "Assignment History",
      statusHistory: "Status History",
      noAssignments: "No assignments yet",
      noStatusChanges: "No status changes",
      table: {
        owner: "Owner",
        assigned: "Assigned",
        returned: "Returned",
        fromTo: "From → To",
        time: "Time"
      }
    },
    audit: {
      title: "Audit Log",
      subtitle: "Search by asset UUID",
      assetUuid: "Asset UUID",
      search: "Search",
      none: "No audit entries",
      table: {
        event: "Event",
        actor: "Actor",
        time: "Time"
      }
    },
    analytics: {
      statusDist: "Status Distribution",
      categoryDist: "Category Distribution",
      chartStatus: "Assets by Status",
      chartCategory: "Assets by Category"
    },
    categories: {
      title: "Asset Categories",
      subtitle: "Manage categories (create / edit / delete)",
      code: "Code (e.g. IT)",
      name: "Name (e.g. IT)",
      create: "Create",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      table: {
        code: "Code",
        name: "Name",
        actions: "Actions"
      }
    },
    inventory: {
      title: "Inventory",
      subtitle: "Scan assets and detect discrepancies",
      createTitle: "New session",
      name: "Session name",
      ownerType: "Owner type",
      ownerId: "Owner ID (UUID)",
      useMyId: "Use my ID",
      create: "Create session",
      createHint: "Enter name and owner ID.",
      table: {
        name: "Name",
        owner: "Owner",
        status: "Status",
        scanned: "Scanned"
      },
      sessionId: "Session ID",
      status: "Status",
      close: "Close",
      owner: "Owner",
      expected: "Expected",
      scanned: "Scanned",
      scanAsset: "Scan by asset ID",
      scanQr: "Scan by QR token",
      assetId: "Asset ID (UUID)",
      note: "Note",
      qrToken: "QR token",
      scan: "Scan",
      report: "Report",
      missing: "Missing",
      unexpected: "Unexpected"
    },
    aging: {
      title: "Aging Assets",
      subtitle: "By purchase date or created date",
      days: "Days (e.g. 365)",
      includeTerminal: "Include terminal statuses"
    },
    qr: {
      title: "QR Lookup",
      subtitle: "See current owner and photos by token",
      token: "QR token",
      lookup: "Lookup",
      photos: "Photos"
    },
    status: {
      REGISTERED: "REGISTERED",
      ASSIGNED: "ASSIGNED",
      IN_REPAIR: "IN_REPAIR",
      LOST: "LOST",
      WRITTEN_OFF: "WRITTEN_OFF"
    },
    ownerType: {
      EMPLOYEE: "Employee",
      DEPARTMENT: "Department",
      BRANCH: "Branch"
    },
    lang: {
      uz: "O‘zbekcha",
      en: "English"
    }
  }
};

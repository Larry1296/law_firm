class ITDepartmentService:
    IT_DEPARTMENT_NAMES = {
        "it",
        "i.t",
        "i.t.",
        "information technology",
        "information technologies",
        "technology",
        "tech",
    }

    @classmethod
    def normalize_name(cls, name):
        return (name or "").strip().lower().replace("&", "and")

    @classmethod
    def is_it_department_name(cls, name):
        return cls.normalize_name(name) in cls.IT_DEPARTMENT_NAMES

    @classmethod
    def get_it_department(cls, firm):
        if firm is None:
            return None

        for department in firm.departments.filter(is_active=True):
            if cls.is_it_department_name(department.name):
                return department

        return None

    @classmethod
    def it_department_exists(cls, firm, exclude_department_id=None):
        if firm is None:
            return False

        departments = firm.departments.all()
        if exclude_department_id:
            departments = departments.exclude(id=exclude_department_id)

        return any(cls.is_it_department_name(department.name) for department in departments)


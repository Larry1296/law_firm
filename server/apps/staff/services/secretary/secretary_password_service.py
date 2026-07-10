class SecretaryPasswordService:
    @staticmethod
    def change_password(user, *, old_password, new_password):
        if not hasattr(user, "secretary_profile"):
            raise ValueError("Only secretaries can access this endpoint.")

        if not user.check_password(old_password):
            raise ValueError("Old password is incorrect.")

        user.set_password(new_password)
        user.must_change_password = False
        user.save(update_fields=["password", "must_change_password"])
        return True

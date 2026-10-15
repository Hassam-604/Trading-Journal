"""Local password recovery command for a stopped single-user journal server."""

import getpass
import sys

from sqlalchemy import inspect

from .database import SessionLocal, engine
from .models import AuthCredential
from .routers.auth import PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, _hash_password


def reset_password() -> None:
    if not inspect(engine).has_table(AuthCredential.__tablename__):
        raise SystemExit("Authentication is not initialized; start the app and use first-run setup.")

    with SessionLocal() as db:
        credential = db.get(AuthCredential, 1)
        if not credential:
            raise SystemExit("No journal password is configured; use first-run setup in the app.")

        new_password = getpass.getpass("New journal password: ")
        if not PASSWORD_MIN_LENGTH <= len(new_password) <= PASSWORD_MAX_LENGTH:
            raise SystemExit(
                f"Password must contain between {PASSWORD_MIN_LENGTH} and "
                f"{PASSWORD_MAX_LENGTH} characters."
            )
        confirmation = getpass.getpass("Confirm new journal password: ")
        if new_password != confirmation:
            raise SystemExit("Passwords do not match.")

        credential.password_hash = _hash_password(new_password)
        credential.session_version += 1
        db.commit()

    print("Journal password reset. Existing sessions have been invalidated.")


def main() -> None:
    if sys.argv[1:] != ["reset-password"]:
        raise SystemExit("Usage: python -m backend.auth_admin reset-password")
    reset_password()


if __name__ == "__main__":
    main()

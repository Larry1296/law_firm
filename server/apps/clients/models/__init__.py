from .client import Client

from .individual_client import IndividualClient
from .company_client import CompanyClient
from .partnership_client import PartnershipClient
from .ngo_client import NGOClient
from .trust_client import TrustClient
from .estate_client import EstateClient
from .government_client import GovernmentClient

from .client_address import ClientAddress
from .client_contact import (
    ClientContact,
    ContactType,
    CommunicationChannel,
)
from .client_document import ClientDocument


__all__ = [
    "Client",

    "IndividualClient",
    "CompanyClient",
    "PartnershipClient",
    "NGOClient",
    "TrustClient",
    "EstateClient",
    "GovernmentClient",

    "ClientAddress",
    "ClientContact",
    "ContactType",
    "CommunicationChannel",
    "ClientDocument",
]
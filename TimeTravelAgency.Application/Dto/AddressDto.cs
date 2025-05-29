using TimeTravelAgency.Application.Model;

public record AddressDto
(
    string Street,
    string City,
    int ZipCode
)
{
    public Address ToModel()
    {
        return new Address(Street, ZipCode, City);
    }
}
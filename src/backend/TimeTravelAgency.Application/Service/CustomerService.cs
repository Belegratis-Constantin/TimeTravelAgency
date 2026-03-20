using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;

namespace TimeTravelAgency.Application.Service;

public class CustomerService
{
    private readonly TimeTravelAgencyContext _context;
    
    public CustomerService(TimeTravelAgencyContext context)
    {
        _context = context;
    }
    
    public List<CustomerDto> GetCustomersWithoutBookings()
    {
        return _context.Customers
            .Where(c => c.Trips.Count == 0)
            .Select(c => new CustomerDto(
                c.Guid,
                c.Firstname,
                c.Lastname,
                c.Email,
                c.PhoneNumber,
                c.DateOfBirth,
                new AddressDto(c.Address.Street, c.Address.City, c.Address.Zip),
                new List<ReviewDto>() // Leere Reviews
            )).ToList();
    }
}
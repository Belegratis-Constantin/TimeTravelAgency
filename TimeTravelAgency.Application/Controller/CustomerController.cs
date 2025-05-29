using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using TimeTravelAgency.Application.Cmd;
using TimeTravelAgency.Application.Dto;
using TimeTravelAgency.Application.Infrastructure;
using TimeTravelAgency.Application.Model;
using TimeTravelAgency.Application.Service;

namespace TimeTravelAgency.Application.Controller;

[ApiController]
[Route("api/[controller]")]
public class CustomerController : ControllerBase
{
    private readonly TimeTravelAgencyContext _context;
    private readonly CustomerService _customerService;

    public CustomerController(TimeTravelAgencyContext context)
    {
        _context = context;
        _customerService = new CustomerService(context);
    }

    [HttpPost]
    public IActionResult CreateCustomer([FromBody] CreateCustomerCmd cmd)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var customer = new Customer(
            cmd.Firstname,
            cmd.Lastname,
            cmd.Email,
            cmd.PhoneNumber,
            cmd.DateOfBirth,
            cmd.Address.ToModel()
        );

        _context.Customers.Add(customer);
        _context.SaveChanges();

        var customerDto = new CustomerDto
        (
            customer.Guid,
            customer.Firstname,
            customer.Lastname,
            customer.Email,
            customer.PhoneNumber,
            customer.DateOfBirth,
            new AddressDto
            (
                customer.Address.Street,
                customer.Address.City,
                customer.Address.Zip
            ),
            customer.Reviews.Select(r => new ReviewDto
            (
                r.Guid,
                r.Stars,
                r.Header,
                r.Content
            )).ToList()
        );

        return CreatedAtAction(nameof(GetByGuid), new { guid = customer.Guid }, customerDto);
    }
    
    [HttpGet]
    public IActionResult GetAllCustomers()
    {
        var customers = _context.Customers
            .Select(c => new CustomerDto
            (
                c.Guid,
                c.Firstname,
                c.Lastname,
                c.Email,
                c.PhoneNumber,
                c.DateOfBirth,
                new AddressDto
                (
                    c.Address.Street,
                    c.Address.City,
                    c.Address.Zip
                ),
                c.Reviews.Select(r => new ReviewDto
                (
                    r.Guid,
                    r.Stars,
                    r.Header,
                    r.Content
                )).ToList()
            ))
            .ToList();

        return Ok(customers);
    }

    [HttpGet("{guid}")]
    public IActionResult GetByGuid(Guid guid)
    {
        var customer = _context.Customers
            .FirstOrDefault(c => c.Guid == guid);
            
        if (customer == null)
            return Problem("Customer not found", statusCode: 404);

        var customerDto = _context.Customers
            .Where(c => c.Guid == guid)
            .Select(c => new CustomerDto
            (
                c.Guid,
                c.Firstname,
                c.Lastname,
                c.Email,
                c.PhoneNumber,
                c.DateOfBirth,
                new AddressDto
                (
                    c.Address.Street,
                    c.Address.City,
                    c.Address.Zip
                ),
                c.Reviews.Select(r => new ReviewDto
                (
                    r.Guid,
                    r.Stars,
                    r.Header,
                    r.Content
                )).ToList()
            ))
            .FirstOrDefault();

        return Ok(customerDto);
    }
    
    [HttpGet("validate-email")]
    public IActionResult ValidateEmail([FromQuery] string email)
    {
        var emailRegex = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";

        if (!Regex.IsMatch(email, emailRegex, RegexOptions.IgnoreCase))
        {
            return Problem($"Die E-Mail-Adresse '{email}' ist ungültig.", statusCode: 400);
        }

        return Ok($"Die E-Mail-Adresse '{email}' ist gültig.");
    }
    
    [HttpGet("without-bookings")]
    public IActionResult GetCustomersWithoutBookings()
    {
        var customers = _customerService.GetCustomersWithoutBookings()
            .Select(c => new CustomerDto
            (
                c.guid,
                c.firstname,
                c.lastname,
                c.email,
                c.phoneNumber,
                c.dateOfBirth,
                new AddressDto
                (
                    c.address.Street,
                    c.address.City,
                    c.address.ZipCode
                ),
                new List<ReviewDto>() // Leere Reviews
            )).ToList();

        return Ok(customers);
    }
}
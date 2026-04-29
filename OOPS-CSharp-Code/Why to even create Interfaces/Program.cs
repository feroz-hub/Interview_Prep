using System;

//Q.Why to even create Interfaces?

namespace Why_to_even_create_Interfaces
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }

    
    interface IEmployee
    {       
        public void SetSalary();

        public void SetProject();
    }

    public class PermanentEmployee : IEmployee
    {
        public void SetSalary()
        {
            Console.WriteLine("2000000");
        }
        public void SetProject()
        {
            Console.WriteLine("Citi Bank Project");
        }
    }

    public class ContrctEmployee : IEmployee
    {
        public void SetSalary()
        {
            Console.WriteLine("1500000");
        }
        public void SetProject()
        {
            Console.WriteLine("RBS Project");
        }
    }
}
